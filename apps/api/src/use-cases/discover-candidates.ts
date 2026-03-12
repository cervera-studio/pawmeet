import { COMPATIBILITY_THRESHOLD, DEFAULT_SEARCH_RADIUS_KM } from '@pawmeet/config';
import type { DiscoveryFilters, DogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import {
  calculateBehaviorScore,
  calculateDistance,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from '@pawmeet/utils';
import type {
  DogRepository,
  FollowRepository,
  MatchRepository,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
  followRepo: FollowRepository;
};

// ── Weights from MVP spec ──────────────────────────────────────────────────────

const WEIGHT_SIZE = 0.25;
const WEIGHT_ENERGY = 0.25;
const WEIGHT_BEHAVIOR = 0.2;
const WEIGHT_WALK = 0.15;
const WEIGHT_DISTANCE = 0.1;
const WEIGHT_LEASH = 0.05;

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
  // Time overlap
  const timeSetA = new Set(dogA.walkPrefTime);
  const timeOverlap = dogB.walkPrefTime.filter((t) => timeSetA.has(t)).length;
  const timeTotal = new Set([...dogA.walkPrefTime, ...dogB.walkPrefTime]).size;
  const timeScore = timeTotal > 0 ? timeOverlap / timeTotal : 0;

  // Duration overlap (Jaccard-style on ranges)
  const overlapMin = Math.max(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const overlapMax = Math.min(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const unionMin = Math.min(dogA.walkPrefDurationMin, dogB.walkPrefDurationMin);
  const unionMax = Math.max(dogA.walkPrefDurationMax, dogB.walkPrefDurationMax);
  const durationScore =
    unionMax > unionMin ? Math.max(0, overlapMax - overlapMin) / (unionMax - unionMin) : 0;

  // Terrain overlap
  const terrainSetA = new Set(dogA.walkPrefTerrain);
  const terrainOverlap = dogB.walkPrefTerrain.filter((t) => terrainSetA.has(t)).length;
  const terrainTotal = new Set([...dogA.walkPrefTerrain, ...dogB.walkPrefTerrain]).size;
  const terrainScore = terrainTotal > 0 ? terrainOverlap / terrainTotal : 0;

  return (timeScore + durationScore + terrainScore) / 3;
}

function calculateCompatibilityScore(
  dogA: DogProfile,
  dogB: DogProfile,
  distanceKm: number,
): number {
  const sizeScore = calculateSizeScore(dogA.size, dogB.size);
  const energyScore = calculateEnergyScore(dogA.energyLevel, dogB.energyLevel);
  const behaviorScore = calculateBehaviorScore(dogA.behaviorWithDogs, dogB.behaviorWithDogs);
  const walkScore = calculateWalkScore(dogA, dogB);
  const distScore = calculateDistanceScore(distanceKm);
  const leashScore = calculateLeashScore(dogA.leashBehavior, dogB.leashBehavior);

  return (
    WEIGHT_SIZE * sizeScore +
    WEIGHT_ENERGY * energyScore +
    WEIGHT_BEHAVIOR * behaviorScore +
    WEIGHT_WALK * walkScore +
    WEIGHT_DISTANCE * distScore +
    WEIGHT_LEASH * leashScore
  );
}

// ── Use case ───────────────────────────────────────────────────────────────────

type Suggestion = {
  dog: DogProfile;
  distanceKm: number;
  compatibilityScore: number;
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

// ── Use case factory ────────────────────────────────────────────────────────

export function createDiscoverCandidates({ dogRepo, matchRepo, userRepo, followRepo }: Deps) {
  return async (
    userId: string,
    dogId: string,
    limit?: number,
    filters?: DiscoveryFilters,
  ): Promise<Result<{ suggestions: Suggestion[] }>> => {
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

    // Get already-swiped dog IDs and blocked users
    const swipedIds = new Set(await matchRepo.findSwipedDogIds(dogId));

    // Get candidate dogs
    const candidates = await matchRepo.findCandidateDogs(userId);

    // Apply discovery filters, score, and rank
    const scored = candidates
      .flatMap((c) => {
        if (c.ownerLat === null || c.ownerLon === null) return [];
        if (swipedIds.has(c.dog.id)) return [];
        // Apply user-selected filters before expensive scoring
        if (filters && !matchesFilters(c.dog, filters)) return [];

        const distanceKm = calculateDistance(userLat, userLon, c.ownerLat, c.ownerLon);
        if (distanceKm > radiusKm) return [];

        const score = calculateCompatibilityScore(myDog, c.dog, distanceKm);
        if (score < COMPATIBILITY_THRESHOLD) return [];

        return [
          {
            dog: c.dog,
            ownerId: c.dog.ownerId,
            distanceKm: Math.round(distanceKm * 10) / 10,
            compatibilityScore: Math.round(score * 100) / 100,
          },
        ];
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Filter out blocked users
    const suggestions: Suggestion[] = [];
    for (const s of scored) {
      if (suggestions.length >= effectiveLimit) break;
      const blocked = await followRepo.isBlockedEitherWay(userId, s.ownerId);
      if (!blocked) {
        suggestions.push({
          dog: s.dog,
          distanceKm: s.distanceKm,
          compatibilityScore: s.compatibilityScore,
        });
      }
    }

    return succeed({ suggestions });
  };
}
