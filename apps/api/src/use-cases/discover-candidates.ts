import { COMPATIBILITY_THRESHOLD, DEFAULT_SEARCH_RADIUS_KM } from '@pawmeet/config';
import type { DiscoveryFilters, DogProfile, ScoreBreakdown } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { calculateDistance, logger } from '@pawmeet/utils';
import type { Redis } from '@upstash/redis';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { calculateCompatibilityScoreWithBreakdown } from '../domain/compatibility-scoring.js';
import { hasLocation, hasOwnerLocation } from '../domain/type-guards.js';
import { createCache } from '../lib/cache.js';
import type {
  CandidateDog,
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
  redis: Redis;
};

// ── Use case ───────────────────────────────────────────────────────────────────

type Suggestion = {
  dog: DogProfile;
  distanceKm: number;
  compatibilityScore: number;
  scoreBreakdown: ScoreBreakdown;
  primaryPhotoUrl: string | null;
  ownerDisplayName: string;
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

// ── Use case factory ────────────────────────────────────────────────────────

export function createDiscoverCandidates({
  dogRepo,
  matchRepo,
  userRepo,
  followRepo,
  redis,
}: Deps) {
  const candidatesCache = createCache<CandidateDog>(redis, {
    prefix: 'cache:candidates',
    ttlSeconds: 60,
  });

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
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    // Get current user's location
    const user = await userRepo.findById(userId);
    if (!(user && hasLocation(user))) {
      return fail(new AppError('LOCATION_NOT_SET', ERROR_MESSAGES.LOCATION_NOT_SET, 400));
    }

    const radiusKm = filters?.maxDistanceKm ?? user.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

    // Get candidate dogs (cached PostGIS query — most expensive operation)
    const cacheKey = `${userId}:${dogId}:${radiusKm}`;
    const candidates = await candidatesCache.getList(cacheKey, () =>
      matchRepo.findCandidateDogs(userId, dogId, user.latitude, user.longitude, radiusKm * 1000),
    );

    // Apply discovery filters, score, and rank
    const scored = candidates
      .flatMap((c) => {
        if (!hasOwnerLocation(c)) return [];
        // Apply user-selected filters before expensive scoring
        if (filters && !matchesFilters(c.dog, filters)) return [];

        const distanceKm = calculateDistance(user.latitude, user.longitude, c.ownerLat, c.ownerLon);
        if (distanceKm > radiusKm) return [];

        const breakdown = calculateCompatibilityScoreWithBreakdown(myDog, c.dog, distanceKm);
        if (breakdown.overallScore < COMPATIBILITY_THRESHOLD) return [];

        return [
          {
            dog: c.dog,
            ownerId: c.dog.ownerId,
            distanceKm: Math.round(distanceKm * 10) / 10,
            compatibilityScore: breakdown.overallScore,
            scoreBreakdown: breakdown,
            primaryPhotoUrl: c.primaryPhotoUrl,
            ownerDisplayName: c.ownerDisplayName,
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
          scoreBreakdown: s.scoreBreakdown,
          primaryPhotoUrl: s.primaryPhotoUrl,
          ownerDisplayName: s.ownerDisplayName,
        });
      }
    }

    logger.info('DiscoverCandidates', 'Candidates discovered', {
      userId,
      candidateCount: suggestions.length,
    });

    return succeed({ suggestions });
  };
}
