import type { DogProfile, Match } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import type { matchDeps } from '../../container.js';
import { router } from '../trpc.js';
import { createMatchesRouter } from './matches.js';

// ── Builders ──────────────────────────────────────────────────────────────────

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'user-1',
    name: 'Rex',
    birthDate: new Date('2022-01-01'),
    breed: 'Labrador',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'affidabile',
    bio: null,
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    dogAId: 'dog-1',
    dogBId: 'dog-2',
    compatibilityScore: 0.85,
    createdAt: new Date('2026-03-01'),
    isActive: true,
    ...overrides,
  };
}

function buildMatchDeps(overrides: Partial<typeof matchDeps> = {}): typeof matchDeps {
  return {
    listMatches: vi.fn().mockResolvedValue(
      succeed({
        matches: [
          {
            id: 'match-1',
            compatibilityScore: 0.85,
            otherDog: { id: 'dog-2', name: 'Bella', breed: 'Beagle' },
            otherOwner: { id: 'user-2', displayName: 'Anna' },
          },
        ],
      }),
    ),
    discoverCandidates: vi.fn().mockResolvedValue(
      succeed({
        suggestions: [
          {
            dog: buildDog({ id: 'dog-3', name: 'Luna' }),
            distanceKm: 2.5,
            compatibilityScore: 0.78,
          },
        ],
      }),
    ),
    likeDog: vi.fn().mockResolvedValue(succeed({ isMatch: false })),
    passDog: vi.fn().mockResolvedValue(succeed({ message: 'Passato' })),
    unmatch: vi.fn().mockResolvedValue(succeed({ message: 'Match annullato' })),
    ...overrides,
  };
}

function createAuthenticatedCaller(deps: typeof matchDeps, userId = 'user-1') {
  const appRouter = router({ matches: createMatchesRouter(deps) });
  return appRouter.createCaller({ userId });
}

function createAnonCaller(deps: typeof matchDeps) {
  const appRouter = router({ matches: createMatchesRouter(deps) });
  return appRouter.createCaller({ userId: null });
}

const dogId = '550e8400-e29b-41d4-a716-446655440000';
const targetDogId = '550e8400-e29b-41d4-a716-446655440001';
const matchId = '550e8400-e29b-41d4-a716-446655440002';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('matches router', () => {
  describe('list', () => {
    it('returns enriched matches for authenticated user', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.matches.list();

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].compatibilityScore).toBe(0.85);
      expect(deps.listMatches).toHaveBeenCalledWith('user-1');
    });

    it('returns empty matches when user has none', async () => {
      const deps = buildMatchDeps({
        listMatches: vi.fn().mockResolvedValue(succeed({ matches: [] })),
      });
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.matches.list();

      expect(result.matches).toEqual([]);
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildMatchDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.matches.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('discover', () => {
    it('returns suggestions', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.matches.discover({ dogId });

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].compatibilityScore).toBe(0.78);
      expect(deps.discoverCandidates).toHaveBeenCalledWith('user-1', dogId, undefined);
    });

    it('passes limit to use case', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      await caller.matches.discover({ dogId, limit: 10 });

      expect(deps.discoverCandidates).toHaveBeenCalledWith('user-1', dogId, 10);
    });

    it('throws BAD_REQUEST when location is not set', async () => {
      const deps = buildMatchDeps({
        discoverCandidates: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('LOCATION_NOT_SET', 'Posizione non impostata', 400)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.matches.discover({ dogId })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('throws NOT_FOUND when dog does not exist', async () => {
      const deps = buildMatchDeps({
        discoverCandidates: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.matches.discover({ dogId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildMatchDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.matches.discover({ dogId })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects invalid dogId (not UUID)', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(
        caller.matches.discover({ dogId: 'not-a-uuid' }),
      ).rejects.toThrow(TRPCError);
      expect(deps.discoverCandidates).not.toHaveBeenCalled();
    });
  });

  describe('like', () => {
    it('records a like and returns isMatch false when no reciprocal', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.matches.like({ dogId, targetDogId });

      expect(result.isMatch).toBe(false);
      expect(deps.likeDog).toHaveBeenCalledWith('user-1', dogId, targetDogId);
    });

    it('returns isMatch true on mutual like', async () => {
      const match = buildMatch();
      const deps = buildMatchDeps({
        likeDog: vi.fn().mockResolvedValue(succeed({ match, isMatch: true })),
      });
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.matches.like({ dogId, targetDogId });

      expect(result.isMatch).toBe(true);
      expect(result.match).toBeDefined();
    });

    it('throws TOO_MANY_REQUESTS when daily swipe limit reached', async () => {
      const deps = buildMatchDeps({
        likeDog: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('SWIPE_LIMIT_REACHED', 'Limite giornaliero', 429)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.matches.like({ dogId, targetDogId })).rejects.toMatchObject({
        code: 'TOO_MANY_REQUESTS',
      });
    });

    it('throws CONFLICT when already swiped', async () => {
      const deps = buildMatchDeps({
        likeDog: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('ALREADY_SWIPED', 'Già votato', 409)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.matches.like({ dogId, targetDogId })).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildMatchDeps();
      const caller = createAnonCaller(deps);

      await expect(
        caller.matches.like({ dogId, targetDogId }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('pass', () => {
    it('records a pass', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.matches.pass({ dogId, targetDogId });

      expect(result.message).toBe('Passato');
      expect(deps.passDog).toHaveBeenCalledWith('user-1', dogId, targetDogId);
    });

    it('throws CONFLICT when already swiped', async () => {
      const deps = buildMatchDeps({
        passDog: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('ALREADY_SWIPED', 'Già votato', 409)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.matches.pass({ dogId, targetDogId })).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildMatchDeps();
      const caller = createAnonCaller(deps);

      await expect(
        caller.matches.pass({ dogId, targetDogId }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('unmatch', () => {
    it('removes a match', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.matches.unmatch({ matchId });

      expect(result.message).toBe('Match annullato');
      expect(deps.unmatch).toHaveBeenCalledWith('user-1', matchId);
    });

    it('throws NOT_FOUND when match does not exist', async () => {
      const deps = buildMatchDeps({
        unmatch: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('MATCH_NOT_FOUND', 'Match non trovato', 404)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.matches.unmatch({ matchId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildMatchDeps();
      const caller = createAnonCaller(deps);

      await expect(
        caller.matches.unmatch({ matchId }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('rejects invalid matchId (not UUID)', async () => {
      const deps = buildMatchDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(
        caller.matches.unmatch({ matchId: 'not-a-uuid' }),
      ).rejects.toThrow(TRPCError);
      expect(deps.unmatch).not.toHaveBeenCalled();
    });
  });
});
