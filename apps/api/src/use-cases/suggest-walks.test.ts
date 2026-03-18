import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildFollowRepo,
  buildMatchingAiRepo,
  buildMatchRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createSuggestWalks } from './suggest-walks.js';

describe('createSuggestWalks', () => {
  const myDog = buildDog({
    id: 'dog-1',
    ownerId: 'user-1',
    walkPrefTime: ['mattina', 'pomeriggio'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
  });
  const nearbyDog = buildDog({
    id: 'dog-2',
    ownerId: 'user-2',
    name: 'Bella',
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 20,
    walkPrefDurationMax: 50,
    walkPrefTerrain: ['parco'],
  });
  const user = buildUser({ id: 'user-1', latitude: 41.9028, longitude: 12.4964 });

  const activityWindows = [
    {
      id: 'w-1',
      userId: 'user-1',
      dayOfWeek: 1,
      hourOfDay: 9,
      activityCount: 5,
      updatedAt: new Date(),
    },
    {
      id: 'w-2',
      userId: 'user-1',
      dayOfWeek: 3,
      hourOfDay: 14,
      activityCount: 3,
      updatedAt: new Date(),
    },
  ];

  function buildDeps(
    overrides: {
      dogRepo?: ReturnType<typeof buildDogRepo>;
      matchRepo?: ReturnType<typeof buildMatchRepo>;
      userRepo?: ReturnType<typeof buildUserRepo>;
      followRepo?: ReturnType<typeof buildFollowRepo>;
      matchingAiRepo?: ReturnType<typeof buildMatchingAiRepo>;
    } = {},
  ) {
    return {
      dogRepo:
        overrides.dogRepo ??
        buildDogRepo({
          findByIdAndOwner: vi.fn().mockResolvedValue(myDog),
        }),
      matchRepo:
        overrides.matchRepo ??
        buildMatchRepo({
          findCandidateDogs: vi
            .fn()
            .mockResolvedValue([{ dog: nearbyDog, ownerLat: 41.91, ownerLon: 12.5 }]),
        }),
      userRepo:
        overrides.userRepo ??
        buildUserRepo({
          findById: vi.fn().mockResolvedValue(user),
        }),
      followRepo:
        overrides.followRepo ??
        buildFollowRepo({
          isBlockedEitherWay: vi.fn().mockResolvedValue(false),
        }),
      matchingAiRepo:
        overrides.matchingAiRepo ??
        buildMatchingAiRepo({
          findActivityWindowsByUser: vi.fn().mockResolvedValue(activityWindows),
          findNearbyActivityWindows: vi
            .fn()
            .mockResolvedValue([{ userId: 'user-2', activityCount: 3 }]),
        }),
    };
  }

  it('returns suggestions when time windows overlap with dog prefs and compatible dogs exist', async () => {
    const deps = buildDeps();
    const suggestWalks = createSuggestWalks(deps);
    const result = await suggestWalks('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;

    expect(result.data.suggestions.length).toBeGreaterThan(0);
    const suggestion = result.data.suggestions[0]!;
    expect(suggestion.score).toBeGreaterThan(0);
    expect(suggestion.nearbyCompatibleDogs.length).toBeGreaterThan(0);
    expect(suggestion.terrainSuggestion).toBeTruthy();
    expect(suggestion.estimatedDurationMin).toBeGreaterThan(0);
    expect(suggestion.timeSlot).toHaveProperty('dayOfWeek');
    expect(suggestion.timeSlot).toHaveProperty('hourStart');
    expect(suggestion.timeSlot).toHaveProperty('hourEnd');
  });

  it('returns empty when user has no activity windows', async () => {
    const deps = buildDeps({
      matchingAiRepo: buildMatchingAiRepo({
        findActivityWindowsByUser: vi.fn().mockResolvedValue([]),
      }),
    });
    const suggestWalks = createSuggestWalks(deps);
    const result = await suggestWalks('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions).toEqual([]);
  });

  it('returns empty when no nearby dogs are active in overlapping windows', async () => {
    const deps = buildDeps({
      matchingAiRepo: buildMatchingAiRepo({
        findActivityWindowsByUser: vi.fn().mockResolvedValue(activityWindows),
        findNearbyActivityWindows: vi.fn().mockResolvedValue([]),
      }),
    });
    const suggestWalks = createSuggestWalks(deps);
    const result = await suggestWalks('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions).toEqual([]);
  });

  it('fails DOG_NOT_FOUND when dog does not belong to user', async () => {
    const deps = buildDeps({
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(null),
      }),
    });
    const suggestWalks = createSuggestWalks(deps);
    const result = await suggestWalks('user-1', 'dog-nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails LOCATION_NOT_SET when user has no location', async () => {
    const deps = buildDeps({
      userRepo: buildUserRepo({
        findById: vi.fn().mockResolvedValue(buildUser({ latitude: null, longitude: null })),
      }),
    });
    const suggestWalks = createSuggestWalks(deps);
    const result = await suggestWalks('user-1', 'dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('LOCATION_NOT_SET');
    expect(result.error.status).toBe(400);
  });

  it('filters blocked users', async () => {
    const deps = buildDeps({
      followRepo: buildFollowRepo({
        isBlockedEitherWay: vi.fn().mockResolvedValue(true),
      }),
    });
    const suggestWalks = createSuggestWalks(deps);
    const result = await suggestWalks('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    // All candidates are blocked, so no suggestions
    expect(result.data.suggestions).toEqual([]);
  });

  it('respects limit parameter', async () => {
    const deps = buildDeps({
      matchingAiRepo: buildMatchingAiRepo({
        findActivityWindowsByUser: vi.fn().mockResolvedValue([
          {
            id: 'w-1',
            userId: 'user-1',
            dayOfWeek: 1,
            hourOfDay: 9,
            activityCount: 5,
            updatedAt: new Date(),
          },
          {
            id: 'w-2',
            userId: 'user-1',
            dayOfWeek: 2,
            hourOfDay: 10,
            activityCount: 4,
            updatedAt: new Date(),
          },
          {
            id: 'w-3',
            userId: 'user-1',
            dayOfWeek: 3,
            hourOfDay: 14,
            activityCount: 3,
            updatedAt: new Date(),
          },
        ]),
        findNearbyActivityWindows: vi
          .fn()
          .mockResolvedValue([{ userId: 'user-2', activityCount: 3 }]),
      }),
    });
    const suggestWalks = createSuggestWalks(deps);
    const result = await suggestWalks('user-1', 'dog-1', 1);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.length).toBeLessThanOrEqual(1);
  });
});
