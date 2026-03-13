import { COMPATIBILITY_THRESHOLD, DEFAULT_SEARCH_RADIUS_KM, STATSIG_GATE } from '@pawmeet/config';
import type { DiscoveryFilters, DogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import {
  blendWeights,
  calculateBehaviorScore,
  calculateDistance,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
  calculateWeightedScore,
  type MatchingWeights,
} from '@pawmeet/utils';
import type {
  DogRepository,
  ExperimentService,
  MatchingAiRepository,
  MatchRepository,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
  matchingAiRepo: MatchingAiRepository;
  experimentService: ExperimentService;
};

// ── Scoring helpers ────────────────────────────────────────────────────────────

const LEASH_SCORES: Record<string, number> = {
  eccellente: 1.0,
  buono: 0.7,
  in_addestramento: 0.4,
  difficile: 0.1,
};

function calculateLeashScore(a: string, b: string): number {
  const scoreA = LEASH_SCORES[a] ?? 0.5;
  const scoreB = LEASH_SCORES[b] ?? 0.5;
  return 1 - Math.abs(scoreA - scoreB);
}

function calculateWalkScore(
  dogA: {
    walkPrefTime: string[];
    walkPrefDurationMin: number;
    walkPrefDurationMax: number;
    walkPrefTerrain: string[];
  },
  dogB: {
    walkPrefTime: string[];
    walkPrefDurationMin: number;
    walkPrefDurationMax: number;
    walkPrefTerrain: string[];
  },
): number {
  const timeSetA = new Set(dogA.walkPrefTime);
  const timeOverlap = dogB.walkPrefTime.filter((t) => timeSetA.has(t)).length;
  const timeTotal = new Set([...dogA.walkPrefTime, ...dogB.walkPrefTime]).size;
  const timeScore = timeTotal > 0 ? timeOverlap / timeTotal : 0;

  const overlapMin = Math.max(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const overlapMax = Math.min(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const unionMin = Math.min(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const unionMax = Math.max(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const durationScore =
    unionMax > unionMin ? Math.max(0, overlapMax - overlapMin) / (unionMax - unionMin) : 0;

  const terrainSetA = new Set(dogA.walkPrefTerrain);
  const terrainOverlap = dogB.walkPrefTerrain.filter((t) => terrainSetA.has(t)).length;
  const terrainTotal = new Set([...dogA.walkPrefTerrain, ...dogB.walkPrefTerrain]).size;
  const terrainScore = terrainTotal > 0 ? terrainOverlap / terrainTotal : 0;

  return (timeScore + durationScore + terrainScore) / 3;
}

function getScoreBreakdown(dogA: DogProfile, dogB: DogProfile, distanceKm: number) {
  return {
    sizeScore: calculateSizeScore(dogA.size, dogB.size),
    energyScore: calculateEnergyScore(dogA.energyLevel, dogB.energyLevel),
    behaviorScore: calculateBehaviorScore(dogA.behaviorWithDogs, dogB.behaviorWithDogs),
    walkScore: calculateWalkScore(dogA, dogB),
    distanceScore: calculateDistanceScore(distanceKm),
    leashScore: calculateLeashScore(dogA.leashBehavior, dogB.leashBehavior),
  };
}

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
  matchingAiRepo,
  experimentService,
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
    if (
      user?.latitude === null ||
      user?.latitude === undefined ||
      user?.longitude === null ||
      user?.longitude === undefined
    ) {
      return fail(new AppError('LOCATION_NOT_SET', 'Posizione non impostata', 400));
    }
    const userLat = user.latitude;
    const userLon = user.longitude;

    const radiusKm = filters?.maxDistanceKm ?? user.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

    // Check Statsig feature gate for AI matching
    const useAi = await experimentService.checkGate(userId, STATSIG_GATE.AI_MATCHING);
    const variant = useAi ? 'ai_enhanced' : 'rule_based';

    // Determine weights based on variant
    let weights: MatchingWeights;
    if (useAi) {
      const prefs = await matchingAiRepo.findUserPreferences(userId);
      weights = blendWeights(prefs);
    } else {
      weights = {
        size: 0.25,
        energy: 0.25,
        behavior: 0.2,
        walk: 0.15,
        distance: 0.1,
        leash: 0.05,
      };
    }

    // Get already-swiped dog IDs
    const swipedIds = new Set(await matchRepo.findSwipedDogIds(dogId));

    // Get candidate dogs
    const candidates = await matchRepo.findCandidateDogs(userId);

    // Apply filters, score, and rank
    const scored = candidates
      .flatMap((c) => {
        if (c.ownerLat === null || c.ownerLon === null) return [];
        if (swipedIds.has(c.dog.id)) return [];
        if (filters && !matchesFilters(c.dog, filters)) return [];

        const distanceKm = calculateDistance(userLat, userLon, c.ownerLat, c.ownerLon);
        if (distanceKm > radiusKm) return [];

        const breakdown = getScoreBreakdown(myDog, c.dog, distanceKm);
        const score = calculateWeightedScore(breakdown, weights);
        if (score < COMPATIBILITY_THRESHOLD) return [];

        return [
          {
            dog: c.dog,
            distanceKm: Math.round(distanceKm * 10) / 10,
            compatibilityScore: Math.round(score * 100) / 100,
            scoreBreakdown: breakdown,
          },
        ];
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, effectiveLimit);

    return succeed({ suggestions: scored, variant });
  };
}
