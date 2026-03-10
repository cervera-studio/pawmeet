import {
  COMPATIBILITY_THRESHOLD,
  DEFAULT_SEARCH_RADIUS_KM,
  SWIPE_DAILY_LIMIT,
} from '@dogwalk/config';
import { dogProfiles, matches, swipes, users } from '@dogwalk/db';
import type {
  BehaviorWithDogs,
  DogSize,
  EnergyLevel,
  LeashBehavior,
  WalkTerrain,
  WalkTime,
} from '@dogwalk/types';
import {
  calculateBehaviorScore,
  calculateDistance,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from '@dogwalk/utils';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gte, ne, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };

// ── Weights from MVP spec ──────────────────────────────────────────────────────

const WEIGHT_SIZE = 0.25;
const WEIGHT_ENERGY = 0.25;
const WEIGHT_BEHAVIOR = 0.2;
const WEIGHT_WALK = 0.15;
const WEIGHT_DISTANCE = 0.1;
const WEIGHT_LEASH = 0.05;

// ── Validation schemas ─────────────────────────────────────────────────────────

const swipeSchema = z.object({
  dogId: z.string().uuid(),
  targetDogId: z.string().uuid(),
});

const discoverQuerySchema = z.object({
  dogId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// ── Scoring helpers ────────────────────────────────────────────────────────────

const LEASH_SCORES: Record<LeashBehavior, number> = {
  eccellente: 1.0,
  buono: 0.7,
  in_addestramento: 0.4,
  difficile: 0.1,
};

function calculateLeashScore(a: string, b: string): number {
  const scoreA = LEASH_SCORES[a as LeashBehavior] ?? 0.5;
  const scoreB = LEASH_SCORES[b as LeashBehavior] ?? 0.5;
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

function calculateCompatibilityScore(dogA: DogRecord, dogB: DogRecord, distanceKm: number): number {
  const sizeScore = calculateSizeScore(dogA.size as DogSize, dogB.size as DogSize);
  const energyScore = calculateEnergyScore(
    dogA.energyLevel as EnergyLevel,
    dogB.energyLevel as EnergyLevel,
  );
  const behaviorScore = calculateBehaviorScore(
    dogA.behaviorWithDogs as BehaviorWithDogs,
    dogB.behaviorWithDogs as BehaviorWithDogs,
  );
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

// Minimal dog type for scoring
interface DogRecord {
  id: string;
  ownerId: string;
  name: string;
  size: string;
  energyLevel: string;
  behaviorWithDogs: string;
  leashBehavior: string;
  walkPrefTime: string[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: string[];
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export const matchRoutes = new Hono<Env>()
  .use('/*', authMiddleware)

  /** List current user's active mutual matches. */
  .get('/', async (c) => {
    const userId = c.get('userId');

    // Get user's dog IDs
    const userDogs = await db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, userId), eq(dogProfiles.isActive, true)));

    if (userDogs.length === 0) {
      return c.json({ matches: [] });
    }

    const dogIds = userDogs.map((d) => d.id);

    // Find matches where any of the user's dogs is involved
    const userMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.isActive, true),
          or(
            ...dogIds.map((id) => eq(matches.dogAId, id)),
            ...dogIds.map((id) => eq(matches.dogBId, id)),
          ),
        ),
      );

    return c.json({ matches: userMatches });
  })

  /** Discover candidate dogs ranked by compatibility score. Filters by radius and threshold (0.4). */
  .get('/discover', zValidator('query', discoverQuerySchema), async (c) => {
    const userId = c.get('userId');
    const { dogId, limit: queryLimit } = c.req.valid('query');
    const effectiveLimit = queryLimit ?? 20;

    // Verify ownership
    const [myDog] = await db
      .select()
      .from(dogProfiles)
      .where(and(eq(dogProfiles.id, dogId), eq(dogProfiles.ownerId, userId)));

    if (!myDog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    // Get current user's location
    const [currentUser] = await db
      .select({
        latitude: users.latitude,
        longitude: users.longitude,
        searchRadiusKm: users.searchRadiusKm,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!currentUser?.latitude || !currentUser?.longitude) {
      return c.json({ error: 'Posizione non impostata' }, 400);
    }

    const radiusKm = currentUser.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

    // Get dogs the user already swiped on
    const alreadySwiped = await db
      .select({ swipedDogId: swipes.swipedDogId })
      .from(swipes)
      .where(eq(swipes.swiperDogId, dogId));

    const swipedIds = new Set(alreadySwiped.map((s) => s.swipedDogId));

    // Get candidate dogs: active, not owned by user, with owner location
    const candidates = await db
      .select({
        dog: dogProfiles,
        ownerLat: users.latitude,
        ownerLon: users.longitude,
      })
      .from(dogProfiles)
      .innerJoin(users, eq(dogProfiles.ownerId, users.id))
      .where(
        and(
          eq(dogProfiles.isActive, true),
          ne(dogProfiles.ownerId, userId),
          eq(users.isActive, true),
        ),
      );

    // Score and filter candidates in application layer
    const scored = candidates
      .filter((c) => {
        if (!c.ownerLat || !c.ownerLon) return false;
        if (swipedIds.has(c.dog.id)) return false;
        return true;
      })
      .map((c) => {
        const distanceKm = calculateDistance(
          currentUser.latitude!,
          currentUser.longitude!,
          c.ownerLat!,
          c.ownerLon!,
        );
        if (distanceKm > radiusKm) return null;

        const score = calculateCompatibilityScore(
          myDog as unknown as DogRecord,
          c.dog as unknown as DogRecord,
          distanceKm,
        );

        return {
          dog: c.dog,
          distanceKm: Math.round(distanceKm * 10) / 10,
          compatibilityScore: Math.round(score * 100) / 100,
        };
      })
      .filter(
        (c): c is NonNullable<typeof c> =>
          c !== null && c.compatibilityScore >= COMPATIBILITY_THRESHOLD,
      )
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, effectiveLimit);

    return c.json({ suggestions: scored });
  })

  /** Like a dog profile. Creates a match if the like is mutual. Daily limit: 100 swipes. */
  .post('/like', zValidator('json', swipeSchema), async (c) => {
    const userId = c.get('userId');
    const { dogId, targetDogId } = c.req.valid('json');

    // Verify ownership
    const [myDog] = await db
      .select()
      .from(dogProfiles)
      .where(and(eq(dogProfiles.id, dogId), eq(dogProfiles.ownerId, userId)));

    if (!myDog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    // Check daily swipe limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySwipes = await db
      .select({ id: swipes.id })
      .from(swipes)
      .where(and(eq(swipes.swiperDogId, dogId), gte(swipes.createdAt, today)));

    if (todaySwipes.length >= SWIPE_DAILY_LIMIT) {
      return c.json({ error: 'Limite giornaliero di swipe raggiunto' }, 429);
    }

    // Check if already swiped
    const [existing] = await db
      .select()
      .from(swipes)
      .where(and(eq(swipes.swiperDogId, dogId), eq(swipes.swipedDogId, targetDogId)));

    if (existing) {
      return c.json({ error: 'Già votato per questo profilo' }, 409);
    }

    // Record the swipe
    await db.insert(swipes).values({
      swiperDogId: dogId,
      swipedDogId: targetDogId,
      direction: 'like',
    });

    // Check if it's a mutual like (match!)
    const [reciprocal] = await db
      .select()
      .from(swipes)
      .where(
        and(
          eq(swipes.swiperDogId, targetDogId),
          eq(swipes.swipedDogId, dogId),
          eq(swipes.direction, 'like'),
        ),
      );

    if (reciprocal) {
      // Create a match record
      const [match] = await db
        .insert(matches)
        .values({
          dogAId: dogId,
          dogBId: targetDogId,
          compatibilityScore: 0, // will be recalculated
        })
        .returning();

      return c.json({ match, isMatch: true }, 201);
    }

    return c.json({ isMatch: false });
  })

  /** Pass on a dog profile. Daily limit: 100 swipes. */
  .post('/pass', zValidator('json', swipeSchema), async (c) => {
    const userId = c.get('userId');
    const { dogId, targetDogId } = c.req.valid('json');

    // Verify ownership
    const [myDog] = await db
      .select()
      .from(dogProfiles)
      .where(and(eq(dogProfiles.id, dogId), eq(dogProfiles.ownerId, userId)));

    if (!myDog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    // Check daily swipe limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySwipes = await db
      .select({ id: swipes.id })
      .from(swipes)
      .where(and(eq(swipes.swiperDogId, dogId), gte(swipes.createdAt, today)));

    if (todaySwipes.length >= SWIPE_DAILY_LIMIT) {
      return c.json({ error: 'Limite giornaliero di swipe raggiunto' }, 429);
    }

    // Check if already swiped
    const [existing] = await db
      .select()
      .from(swipes)
      .where(and(eq(swipes.swiperDogId, dogId), eq(swipes.swipedDogId, targetDogId)));

    if (existing) {
      return c.json({ error: 'Già votato per questo profilo' }, 409);
    }

    // Record the pass
    await db.insert(swipes).values({
      swiperDogId: dogId,
      swipedDogId: targetDogId,
      direction: 'pass',
    });

    return c.json({ message: 'Passato' });
  })

  /** Unmatch (soft-delete). User must own one of the matched dogs. */
  .delete('/:id', async (c) => {
    const userId = c.get('userId');
    const matchId = c.req.param('id');

    // Find the match
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));

    if (!match || !match.isActive) {
      return c.json({ error: 'Match non trovato' }, 404);
    }

    // Verify the user owns one of the dogs in the match
    const userDogs = await db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, userId), eq(dogProfiles.isActive, true)));

    const dogIds = new Set(userDogs.map((d) => d.id));
    if (!dogIds.has(match.dogAId) && !dogIds.has(match.dogBId)) {
      return c.json({ error: 'Match non trovato' }, 404);
    }

    // Soft-delete the match
    await db.update(matches).set({ isActive: false }).where(eq(matches.id, matchId));

    return c.json({ message: 'Match annullato' });
  });
