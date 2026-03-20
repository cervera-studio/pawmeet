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

type WalkTimeBucket = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_evening';

function hourToWalkTime(hour: number): WalkTimeBucket {
  if (hour >= 5 && hour < 7) return 'early_morning';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'late_evening';
}

function walkTimeBucketToHourRange(bucket: WalkTimeBucket): { start: number; end: number } {
  switch (bucket) {
    case 'early_morning':
      return { start: 5, end: 7 };
    case 'morning':
      return { start: 7, end: 12 };
    case 'afternoon':
      return { start: 12, end: 17 };
    case 'evening':
      return { start: 17, end: 20 };
    case 'late_evening':
      return { start: 20, end: 23 };
  }
}

// ── Helper types ────────────────────────────────────────────────────────────

type CandidateEntry = Awaited<ReturnType<MatchRepository['findCandidateDogs']>>[number];
type ActivityWindow = Awaited<
  ReturnType<MatchingAiRepository['findActivityWindowsByUser']>
>[number];

type WindowResult = {
  window: ActivityWindow;
  dogs: WalkSuggestionDog[];
  avgCompatibility: number;
  terrainSuggestion: string;
  estimatedDurationMin: number;
};

// ── Extracted helpers ───────────────────────────────────────────────────────

async function findCompatibleDogsForWindow(
  candidates: CandidateEntry[],
  nearbyUserIds: Set<string>,
  myDog: {
    walkPrefTerrain: readonly string[];
    walkPrefDurationMin: number;
    walkPrefDurationMax: number;
  } & Parameters<typeof calculateCompatibilityScoreWithBreakdown>[0],
  user: { latitude: number; longitude: number },
  userId: string,
  followRepo: FollowRepository,
): Promise<{ compatibleDogs: WalkSuggestionDog[]; terrainCounts: Map<WalkTerrain, number> }> {
  const compatibleDogs: WalkSuggestionDog[] = [];
  const terrainCounts = new Map<WalkTerrain, number>();

  for (const c of candidates) {
    if (!hasOwnerLocation(c)) continue;
    if (!nearbyUserIds.has(c.dog.ownerId)) continue;

    const distanceKm = calculateDistance(user.latitude, user.longitude, c.ownerLat, c.ownerLon);
    const breakdown = calculateCompatibilityScoreWithBreakdown(myDog, c.dog, distanceKm);
    if (breakdown.overallScore < COMPATIBILITY_THRESHOLD) continue;

    const blocked = await followRepo.isBlockedEitherWay(userId, c.dog.ownerId);
    if (blocked) continue;

    compatibleDogs.push({
      dogId: c.dog.id,
      dogName: c.dog.name,
      breed: c.dog.breed,
      compatibilityScore: breakdown.overallScore,
      distanceKm: Math.round(distanceKm * 10) / 10,
    });

    for (const terrain of c.dog.walkPrefTerrain) {
      if (myDog.walkPrefTerrain.includes(terrain)) {
        terrainCounts.set(terrain, (terrainCounts.get(terrain) ?? 0) + 1);
      }
    }
  }

  return { compatibleDogs, terrainCounts };
}

function pickTopTerrain(terrainCounts: Map<WalkTerrain, number>, fallback: string): string {
  let terrainSuggestion = fallback;
  let maxTerrainCount = 0;
  for (const [terrain, count] of terrainCounts) {
    if (count > maxTerrainCount) {
      maxTerrainCount = count;
      terrainSuggestion = terrain;
    }
  }
  return terrainSuggestion;
}

function estimateDuration(
  candidates: CandidateEntry[],
  compatibleDogIds: Set<string>,
  myDog: { walkPrefDurationMin: number; walkPrefDurationMax: number },
): number {
  let durationSum = 0;
  let durationCount = 0;
  for (const c of candidates) {
    if (!compatibleDogIds.has(c.dog.id)) continue;
    const overlapMin = Math.max(myDog.walkPrefDurationMin, c.dog.walkPrefDurationMin);
    const overlapMax = Math.min(myDog.walkPrefDurationMax, c.dog.walkPrefDurationMax);
    if (overlapMax >= overlapMin) {
      durationSum += (overlapMin + overlapMax) / 2;
      durationCount++;
    }
  }
  return durationCount > 0
    ? Math.round(durationSum / durationCount)
    : Math.round((myDog.walkPrefDurationMin + myDog.walkPrefDurationMax) / 2);
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

    const myDog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!myDog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    const user = await userRepo.findById(userId);
    if (!(user && hasLocation(user))) {
      return fail(new AppError('LOCATION_NOT_SET', 'Posizione non impostata', 400));
    }

    const activityWindows = await matchingAiRepo.findActivityWindowsByUser(userId);
    if (activityWindows.length === 0) {
      return succeed({ suggestions: [] });
    }

    const dogWalkTimes = new Set(myDog.walkPrefTime);
    const qualifyingWindows = activityWindows.filter((w) =>
      dogWalkTimes.has(hourToWalkTime(w.hourOfDay)),
    );
    if (qualifyingWindows.length === 0) {
      return succeed({ suggestions: [] });
    }

    const candidates = await matchRepo.findCandidateDogs(userId);
    const rawSuggestions: WindowResult[] = [];

    for (const window of qualifyingWindows) {
      const nearbyActive = await matchingAiRepo.findNearbyActivityWindows(
        userId,
        window.dayOfWeek,
        window.hourOfDay,
      );
      const nearbyUserIds = new Set(nearbyActive.map((n) => n.userId));

      const { compatibleDogs, terrainCounts } = await findCompatibleDogsForWindow(
        candidates,
        nearbyUserIds,
        myDog,
        user,
        userId,
        followRepo,
      );
      if (compatibleDogs.length === 0) continue;

      const terrainSuggestion = pickTopTerrain(terrainCounts, myDog.walkPrefTerrain[0] ?? 'park');
      const compatibleDogIds = new Set(compatibleDogs.map((d) => d.dogId));
      const estimatedDurationMin = estimateDuration(candidates, compatibleDogIds, myDog);
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
