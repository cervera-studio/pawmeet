import { COMPATIBILITY_THRESHOLD, DEFAULT_SEARCH_RADIUS_KM, STATSIG_GATE } from '@pawmeet/config';
import type { DiscoveryFilters, DogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { calculateDistance } from '@pawmeet/utils';
import type { ScoringStrategy } from '../domain/scoring-strategy.js';
import { hasLocation, hasOwnerLocation } from '../domain/type-guards.js';
import { redis } from '../lib/redis.js';
import type {
  DogRepository,
  ExperimentService,
  MatchRepository,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
  experimentService: ExperimentService;
  ruleBasedStrategy: ScoringStrategy;
  mlStrategy: ScoringStrategy;
};

// ── Filter helpers ──────────────────────────────────────────────────────────

function hasOverlap(a: readonly string[], b: readonly string[]): boolean {
  const setA = new Set(a);
  return b.some((v) => setA.has(v));
}

function matchesFilters(dog: DogProfile, filters: DiscoveryFilters): boolean {
  if (filters.size?.length && !filters.size.includes(dog.size)) return false;
  if (filters.energyLevel?.length && !filters.energyLevel.includes(dog.energyLevel)) return false;
  if (filters.gender?.length && !filters.gender.includes(dog.gender)) return false;
  if (
    filters.behaviorWithDogs?.length &&
    !filters.behaviorWithDogs.includes(dog.behaviorWithDogs)
  ) {
    return false;
  }
  if (filters.walkPrefTime?.length && !hasOverlap(filters.walkPrefTime, dog.walkPrefTime)) {
    return false;
  }
  if (
    filters.walkPrefTerrain?.length &&
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
  scoreBreakdown?: {
    sizeScore: number;
    energyScore: number;
    behaviorScore: number;
    walkScore: number;
    distanceScore: number;
    leashScore: number;
  };
};

export function createDiscoverCandidatesAi({
  dogRepo,
  matchRepo,
  userRepo,
  experimentService,
  ruleBasedStrategy,
  mlStrategy,
}: Deps) {
  return async (
    userId: string,
    dogId: string,
    limit?: number,
    filters?: DiscoveryFilters,
  ): Promise<Result<{ suggestions: Suggestion[]; variant: string }>> => {
    const effectiveLimit = limit ?? 20;

    // Verify ownership
    const myDog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!myDog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    // Get current user's location
    const user = await userRepo.findById(userId);
    if (!user || !hasLocation(user)) {
      return fail(new AppError('LOCATION_NOT_SET', 'Posizione non impostata', 400));
    }

    const radiusKm = filters?.maxDistanceKm ?? user.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

    // Check Statsig feature gate for AI matching
    const useAi = await experimentService.checkGate(userId, STATSIG_GATE.AI_MATCHING);
    const variant = useAi ? 'ai_enhanced' : 'rule_based';
    const strategy = useAi ? mlStrategy : ruleBasedStrategy;

    // Get already-swiped dog IDs
    const swipedIds = new Set(await matchRepo.findSwipedDogIds(dogId));

    // Get candidate dogs
    const candidates = await matchRepo.findCandidateDogs(userId);

    // Apply filters, score, and rank
    const scoredPromises = candidates.flatMap((c) => {
      if (!hasOwnerLocation(c)) return [];
      if (swipedIds.has(c.dog.id)) return [];
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

    // ── Backfill with precomputed recommendations ───────────────────────────
    let suggestions: Suggestion[] = scored;

    if (scored.length < effectiveLimit) {
      const recsKey = `ml:recs:${userId}`;
      const rawRecs = await redis.zrange<string[]>(recsKey, 0, effectiveLimit - 1, { rev: true });

      const scoredDogIds = new Set(scored.map((s) => s.dog.id));
      const candidateMap = new Map(candidates.map((c) => [c.dog.id, c]));

      const backfill: Suggestion[] = [];
      for (const recDogId of rawRecs) {
        if (scoredDogIds.has(recDogId) || swipedIds.has(recDogId)) continue;
        const c = candidateMap.get(recDogId);
        if (!c || !hasOwnerLocation(c)) continue;
        if (filters && !matchesFilters(c.dog, filters)) continue;

        const distanceKm = calculateDistance(user.latitude, user.longitude, c.ownerLat, c.ownerLon);
        if (distanceKm > radiusKm) continue;

        backfill.push({
          dog: c.dog,
          distanceKm: Math.round(distanceKm * 10) / 10,
          compatibilityScore: 0,
        });

        if (scored.length + backfill.length >= effectiveLimit) break;
      }

      suggestions = [...scored, ...backfill];
    }

    // ── Diversity interleave: avoid consecutive same-size dogs ───────────────
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

    return succeed({ suggestions, variant });
  };
}
