import { COMPATIBILITY_THRESHOLD } from '@pawmeet/config';
import type { WalkSuggestion, WalkSuggestionDog, WalkTerrain } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { calculateDistance } from '@pawmeet/utils';
import { calculateCompatibilityScoreWithBreakdown } from '../domain/compatibility-scoring.js';
import { hasLocation, hasOwnerLocation } from '../domain/type-guards.js';
import type {
  DogRepository,
  FollowRepository,
  MatchingAiRepository,
  MatchRepository,
  UserRepository,
} from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  userRepo: UserRepository;
  followRepo: FollowRepository;
  matchingAiRepo: MatchingAiRepository;
};

// ── Hour → WalkTime bucket mapping ──────────────────────────────────────────

type WalkTimeBucket = 'mattina_presto' | 'mattina' | 'pomeriggio' | 'sera' | 'sera_tardi';

function hourToWalkTime(hour: number): WalkTimeBucket {
  if (hour >= 5 && hour < 7) return 'mattina_presto';
  if (hour >= 7 && hour < 12) return 'mattina';
  if (hour >= 12 && hour < 17) return 'pomeriggio';
  if (hour >= 17 && hour < 20) return 'sera';
  return 'sera_tardi';
}

function walkTimeBucketToHourRange(bucket: WalkTimeBucket): { start: number; end: number } {
  switch (bucket) {
    case 'mattina_presto':
      return { start: 5, end: 7 };
    case 'mattina':
      return { start: 7, end: 12 };
    case 'pomeriggio':
      return { start: 12, end: 17 };
    case 'sera':
      return { start: 17, end: 20 };
    case 'sera_tardi':
      return { start: 20, end: 23 };
  }
}

// ── Use case factory ────────────────────────────────────────────────────────

export function createSuggestWalks({
  dogRepo,
  matchRepo,
  userRepo,
  followRepo,
  matchingAiRepo,
}: Deps) {
  return async (
    userId: string,
    dogId: string,
    limit?: number,
  ): Promise<Result<{ suggestions: WalkSuggestion[] }>> => {
    const effectiveLimit = limit ?? 3;

    // 1. Verify dog ownership
    const myDog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!myDog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    // 2. Get user location
    const user = await userRepo.findById(userId);
    if (!user || !hasLocation(user)) {
      return fail(new AppError('LOCATION_NOT_SET', 'Posizione non impostata', 400));
    }

    // 3. Get user activity windows
    const activityWindows = await matchingAiRepo.findActivityWindowsByUser(userId);
    if (activityWindows.length === 0) {
      return succeed({ suggestions: [] });
    }

    // 4. Filter windows to those matching dog's walkPrefTime
    const dogWalkTimes = new Set(myDog.walkPrefTime);
    const qualifyingWindows = activityWindows.filter((w) => {
      const bucket = hourToWalkTime(w.hourOfDay);
      return dogWalkTimes.has(bucket);
    });

    if (qualifyingWindows.length === 0) {
      return succeed({ suggestions: [] });
    }

    // 5. Get all candidate dogs once
    const candidates = await matchRepo.findCandidateDogs(userId);

    // 6. For each qualifying window, find nearby compatible dogs
    const rawSuggestions: Array<{
      window: (typeof qualifyingWindows)[number];
      dogs: WalkSuggestionDog[];
      avgCompatibility: number;
      terrainSuggestion: string;
      estimatedDurationMin: number;
    }> = [];

    for (const window of qualifyingWindows) {
      // Get nearby active users for this time slot
      const nearbyActive = await matchingAiRepo.findNearbyActivityWindows(
        userId,
        window.dayOfWeek,
        window.hourOfDay,
      );
      const nearbyUserIds = new Set(nearbyActive.map((n) => n.userId));

      // Filter candidates to those whose owner is nearby and active
      const compatibleDogs: WalkSuggestionDog[] = [];
      const terrainCounts = new Map<WalkTerrain, number>();

      for (const c of candidates) {
        if (!hasOwnerLocation(c)) continue;
        if (!nearbyUserIds.has(c.dog.ownerId)) continue;

        const distanceKm = calculateDistance(user.latitude, user.longitude, c.ownerLat, c.ownerLon);

        const breakdown = calculateCompatibilityScoreWithBreakdown(myDog, c.dog, distanceKm);
        if (breakdown.overallScore < COMPATIBILITY_THRESHOLD) continue;

        // Check blocked
        const blocked = await followRepo.isBlockedEitherWay(userId, c.dog.ownerId);
        if (blocked) continue;

        compatibleDogs.push({
          dogId: c.dog.id,
          dogName: c.dog.name,
          breed: c.dog.breed,
          compatibilityScore: breakdown.overallScore,
          distanceKm: Math.round(distanceKm * 10) / 10,
        });

        // Count terrain overlaps for suggestion
        for (const terrain of c.dog.walkPrefTerrain) {
          if (myDog.walkPrefTerrain.includes(terrain)) {
            terrainCounts.set(terrain, (terrainCounts.get(terrain) ?? 0) + 1);
          }
        }
      }

      if (compatibleDogs.length === 0) continue;

      // Terrain suggestion: most common overlap, fallback to dog's first terrain
      let terrainSuggestion = myDog.walkPrefTerrain[0] ?? 'parco';
      let maxTerrainCount = 0;
      for (const [terrain, count] of terrainCounts) {
        if (count > maxTerrainCount) {
          maxTerrainCount = count;
          terrainSuggestion = terrain;
        }
      }

      // Estimated duration: midpoint of overlapping duration ranges
      let durationSum = 0;
      let durationCount = 0;
      for (const c of candidates) {
        if (!compatibleDogs.some((d) => d.dogId === c.dog.id)) continue;
        const overlapMin = Math.max(myDog.walkPrefDurationMin, c.dog.walkPrefDurationMin);
        const overlapMax = Math.min(myDog.walkPrefDurationMax, c.dog.walkPrefDurationMax);
        if (overlapMax >= overlapMin) {
          durationSum += (overlapMin + overlapMax) / 2;
          durationCount++;
        }
      }
      const estimatedDurationMin =
        durationCount > 0
          ? Math.round(durationSum / durationCount)
          : Math.round((myDog.walkPrefDurationMin + myDog.walkPrefDurationMax) / 2);

      const avgCompatibility =
        compatibleDogs.reduce((sum, d) => sum + d.compatibilityScore, 0) / compatibleDogs.length;

      rawSuggestions.push({
        window,
        dogs: compatibleDogs.sort((a, b) => b.compatibilityScore - a.compatibilityScore),
        avgCompatibility,
        terrainSuggestion,
        estimatedDurationMin,
      });
    }

    // 7. Sort by composite score (window score 0.4 + avg compatibility 0.6)
    const maxActivityCount = Math.max(...rawSuggestions.map((s) => s.window.activityCount), 1);
    const scored = rawSuggestions
      .map((s) => {
        const windowScore = s.window.activityCount / maxActivityCount;
        const compositeScore =
          Math.round((windowScore * 0.4 + s.avgCompatibility * 0.6) * 100) / 100;
        const bucket = hourToWalkTime(s.window.hourOfDay);
        const hourRange = walkTimeBucketToHourRange(bucket);

        return {
          timeSlot: {
            dayOfWeek: s.window.dayOfWeek,
            hourStart: hourRange.start,
            hourEnd: hourRange.end,
          },
          score: compositeScore,
          terrainSuggestion: s.terrainSuggestion,
          nearbyCompatibleDogs: s.dogs,
          estimatedDurationMin: s.estimatedDurationMin,
        } satisfies WalkSuggestion;
      })
      .sort((a, b) => b.score - a.score);

    return succeed({ suggestions: scored.slice(0, effectiveLimit) });
  };
}
