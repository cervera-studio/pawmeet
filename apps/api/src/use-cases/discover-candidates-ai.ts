import { COMPATIBILITY_THRESHOLD, DEFAULT_SEARCH_RADIUS_KM, STATSIG_GATE } from '@pawmeet/config';
import type { DiscoveryFilters, DogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { calculateDistance } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { ScoringStrategy } from '../domain/scoring-strategy.js';
import { hasLocation, hasOwnerLocation } from '../domain/type-guards.js';
import type { EmbeddingRepository } from '../ports/embedding-repository.js';
import type {
  DogRepository,
  ExperimentService,
  MatchRepository,
  UserRepository,
} from '../ports/index.js';
import type { RecommendationCacheRepository } from '../ports/recommendation-cache-repository.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
  experimentService: ExperimentService;
  ruleBasedStrategy: ScoringStrategy;
  mlStrategy: ScoringStrategy;
  embeddingRepo: EmbeddingRepository;
  recommendationCacheRepo: RecommendationCacheRepository;
};

// ── Filter helpers ──────────────────────────────────────────────────────────

function hasOverlap(a: readonly string[], b: readonly string[]): boolean {
  const setA = new Set(a);
  return b.some((v) => setA.has(v));
}

function matchesFilters(dog: DogProfile, filters: DiscoveryFilters): boolean {
  if (filters.size && filters.size.length > 0 && !filters.size.includes(dog.size)) return false;
  if (
    filters.energyLevel &&
    filters.energyLevel.length > 0 &&
    !filters.energyLevel.includes(dog.energyLevel)
  )
    return false;
  if (filters.gender && filters.gender.length > 0 && !filters.gender.includes(dog.gender))
    return false;
  if (
    filters.behaviorWithDogs &&
    filters.behaviorWithDogs.length > 0 &&
    !filters.behaviorWithDogs.includes(dog.behaviorWithDogs)
  ) {
    return false;
  }
  if (
    filters.walkPrefTime &&
    filters.walkPrefTime.length > 0 &&
    !hasOverlap(filters.walkPrefTime, dog.walkPrefTime)
  ) {
    return false;
  }
  if (
    filters.walkPrefTerrain &&
    filters.walkPrefTerrain.length > 0 &&
    !hasOverlap(filters.walkPrefTerrain, dog.walkPrefTerrain)
  ) {
    return false;
  }
  return true;
}

// ── Use case ───────────────────────────────────────────────────────────────────

type Suggestion = {
  dog: DogProfile;
  distanceKm: number;
  compatibilityScore: number;
  primaryPhotoUrl: string | null;
  scoreBreakdown?: {
    sizeScore: number;
    energyScore: number;
    behaviorScore: number;
    walkScore: number;
    distanceScore: number;
    leashScore: number;
  };
};

type CandidateList = Awaited<ReturnType<MatchRepository['findCandidateDogs']>>;

async function fetchCandidatesWithVector(
  embeddingRepo: EmbeddingRepository,
  matchRepo: MatchRepository,
  dogId: string,
  userId: string,
  effectiveLimit: number,
  swipedIds: Set<string>,
  ownerLat: number,
  ownerLon: number,
  radiusMeters: number,
): Promise<CandidateList> {
  const dogEmbedding = await embeddingRepo.findByDogId(dogId);
  if (!dogEmbedding) {
    return matchRepo.findCandidateDogs(userId, dogId, ownerLat, ownerLon, radiusMeters);
  }

  const nearest = await embeddingRepo.findNearestDogIds(
    dogEmbedding.embedding,
    effectiveLimit * 3,
    userId,
    [...swipedIds],
  );
  const nearestIds = new Set(nearest.map((n) => n.dogId));
  const allCandidates = await matchRepo.findCandidateDogs(
    userId,
    dogId,
    ownerLat,
    ownerLon,
    radiusMeters,
  );
  return allCandidates.filter((c) => nearestIds.has(c.dog.id));
}

function buildBackfill(
  rawRecs: string[],
  scored: Suggestion[],
  candidates: CandidateList,
  swipedIds: Set<string>,
  filters: DiscoveryFilters | undefined,
  userLat: number,
  userLon: number,
  radiusKm: number,
  effectiveLimit: number,
): Suggestion[] {
  const scoredDogIds = new Set(scored.map((s) => s.dog.id));
  const candidateMap = new Map(candidates.map((c) => [c.dog.id, c]));

  const backfill: Suggestion[] = [];
  for (const recDogId of rawRecs) {
    if (scoredDogIds.has(recDogId) || swipedIds.has(recDogId)) continue;
    const c = candidateMap.get(recDogId);
    if (!(c && hasOwnerLocation(c))) continue;
    if (filters && !matchesFilters(c.dog, filters)) continue;

    const distanceKm = calculateDistance(userLat, userLon, c.ownerLat, c.ownerLon);
    if (distanceKm > radiusKm) continue;

    backfill.push({
      dog: c.dog,
      distanceKm: Math.round(distanceKm * 10) / 10,
      compatibilityScore: 0,
      primaryPhotoUrl: c.primaryPhotoUrl,
    });

    if (scored.length + backfill.length >= effectiveLimit) break;
  }
  return backfill;
}

function diversityInterleave(suggestions: Suggestion[]): void {
  for (let i = 1; i < suggestions.length - 1; i++) {
    const curr = suggestions[i];
    const prev = suggestions[i - 1];
    if (curr && prev && curr.dog.size === prev.dog.size) {
      const next = suggestions.findIndex((s, j) => j > i && s.dog.size !== curr.dog.size);
      if (next !== -1) {
        suggestions[i] = suggestions[next]!;
        suggestions[next] = curr;
      }
    }
  }
}

export function createDiscoverCandidatesAi({
  dogRepo,
  matchRepo,
  userRepo,
  experimentService,
  ruleBasedStrategy,
  mlStrategy,
  embeddingRepo,
  recommendationCacheRepo,
}: Deps) {
  return async (
    userId: string,
    dogId: string,
    limit?: number,
    filters?: DiscoveryFilters,
  ): Promise<Result<{ suggestions: Suggestion[]; variant: string }>> => {
    const effectiveLimit = limit ?? 20;

    const myDog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!myDog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    const user = await userRepo.findById(userId);
    if (!(user && hasLocation(user))) {
      return fail(new AppError('LOCATION_NOT_SET', ERROR_MESSAGES.LOCATION_NOT_SET, 400));
    }

    const radiusKm = filters?.maxDistanceKm ?? user.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

    const useAi = await experimentService.checkGate(userId, STATSIG_GATE.AI_MATCHING);
    const useVector = await experimentService.checkGate(userId, STATSIG_GATE.VECTOR_MATCHING);
    const variantBase = useAi ? 'ai_enhanced' : 'rule_based';
    const variant = useVector ? `vector_${variantBase}` : variantBase;
    const strategy = useAi ? mlStrategy : ruleBasedStrategy;

    const swipedIds = new Set(await matchRepo.findSwipedDogIds(dogId));

    const radiusMeters = radiusKm * 1000;
    const candidates = useVector
      ? await fetchCandidatesWithVector(
          embeddingRepo,
          matchRepo,
          dogId,
          userId,
          effectiveLimit,
          swipedIds,
          user.latitude,
          user.longitude,
          radiusMeters,
        )
      : await matchRepo.findCandidateDogs(
          userId,
          dogId,
          user.latitude,
          user.longitude,
          radiusMeters,
        );

    // Apply filters, score, and rank
    const scoredPromises = candidates.flatMap((c) => {
      if (!hasOwnerLocation(c)) return [];
      if (filters && !matchesFilters(c.dog, filters)) return [];

      const distanceKm = calculateDistance(user.latitude, user.longitude, c.ownerLat, c.ownerLon);
      if (distanceKm > radiusKm) return [];

      return [
        strategy.score(myDog, c.dog, distanceKm, userId).then((result) => {
          if (result.overallScore < COMPATIBILITY_THRESHOLD) return null;
          return {
            dog: c.dog,
            distanceKm: Math.round(distanceKm * 10) / 10,
            compatibilityScore: Math.round(result.overallScore * 100) / 100,
            primaryPhotoUrl: c.primaryPhotoUrl,
            scoreBreakdown: {
              sizeScore: result.sizeScore,
              energyScore: result.energyScore,
              behaviorScore: result.behaviorScore,
              walkScore: result.walkScore,
              distanceScore: result.distanceScore,
              leashScore: result.leashScore,
            },
          };
        }),
      ];
    });

    const results = await Promise.all(scoredPromises);
    const scored = results
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, effectiveLimit);

    let suggestions: Suggestion[] = scored;

    if (scored.length < effectiveLimit) {
      const rawRecs = await recommendationCacheRepo.getTopRecommendations(userId, effectiveLimit);
      const backfill = buildBackfill(
        rawRecs,
        scored,
        candidates,
        swipedIds,
        filters,
        user.latitude,
        user.longitude,
        radiusKm,
        effectiveLimit,
      );
      suggestions = [...scored, ...backfill];
    }

    diversityInterleave(suggestions);

    return succeed({ suggestions, variant });
  };
}
