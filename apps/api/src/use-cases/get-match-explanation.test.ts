import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildMatch,
  buildMatchRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createGetMatchExplanation } from './get-match-explanation.js';

describe('createGetMatchExplanation', () => {
  const dogA = buildDog({ id: 'dog-1', ownerId: 'user-1' });
  const dogB = buildDog({
    id: 'dog-2',
    ownerId: 'user-2',
    name: 'Bella',
    size: 'grande',
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    leashBehavior: 'buono',
    walkPrefTime: ['mattina', 'pomeriggio'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['park', 'urban'],
  });
  const match = buildMatch({ id: 'match-1', dogAId: 'dog-1', dogBId: 'dog-2' });
  const ownerA = buildUser({ id: 'user-1', latitude: 41.9028, longitude: 12.4964 });
  const ownerB = buildUser({ id: 'user-2', latitude: 41.91, longitude: 12.5 });

  it('returns score breakdown for valid match', async () => {
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'dog-1') return Promise.resolve(dogA);
        if (id === 'dog-2') return Promise.resolve(dogB);
        return Promise.resolve(null);
      }),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'user-1') return Promise.resolve(ownerA);
        if (id === 'user-2') return Promise.resolve(ownerB);
        return Promise.resolve(null);
      }),
    });

    const getMatchExplanation = createGetMatchExplanation({ matchRepo, dogRepo, userRepo });
    const result = await getMatchExplanation('user-1', 'match-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;

    expect(result.data.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.data.overallScore).toBeLessThanOrEqual(1);

    const { breakdown } = result.data;
    for (const key of ['size', 'energy', 'behavior', 'walk', 'distance', 'leash'] as const) {
      expect(breakdown[key].score).toBeGreaterThanOrEqual(0);
      expect(breakdown[key].score).toBeLessThanOrEqual(1);
    }
  });

  it('fails if match not found', async () => {
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const dogRepo = buildDogRepo();
    const userRepo = buildUserRepo();

    const getMatchExplanation = createGetMatchExplanation({ matchRepo, dogRepo, userRepo });
    const result = await getMatchExplanation('user-1', 'match-nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails if user does not own either dog', async () => {
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'dog-1') return Promise.resolve(dogA);
        if (id === 'dog-2') return Promise.resolve(dogB);
        return Promise.resolve(null);
      }),
    });
    const userRepo = buildUserRepo();

    const getMatchExplanation = createGetMatchExplanation({ matchRepo, dogRepo, userRepo });
    const result = await getMatchExplanation('user-stranger', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FORBIDDEN');
    expect(result.error.status).toBe(403);
  });
});
