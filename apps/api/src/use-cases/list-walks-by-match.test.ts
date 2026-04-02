import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildMatch,
  buildMatchRepo,
  buildWalk,
  buildWalkRepo,
} from '../test-utils/builders.js';
import { createListWalksByMatch } from './list-walks-by-match.js';

function buildDeps(
  overrides: {
    walkRepo?: Partial<Parameters<typeof createListWalksByMatch>[0]['walkRepo']>;
    matchRepo?: Partial<Parameters<typeof createListWalksByMatch>[0]['matchRepo']>;
    dogRepo?: Partial<Parameters<typeof createListWalksByMatch>[0]['dogRepo']>;
  } = {},
) {
  const walkRepo = buildWalkRepo(overrides.walkRepo);
  const matchRepo = buildMatchRepo(overrides.matchRepo);
  const dogRepo = buildDogRepo(overrides.dogRepo);
  return { walkRepo, matchRepo, dogRepo };
}

describe('listWalksByMatch', () => {
  it('returns walks when user owns a dog in the match', async () => {
    const match = buildMatch({ dogAId: 'dog-1', dogBId: 'dog-2', isActive: true });
    const walks = [buildWalk(), buildWalk({ id: 'walk-2' })];
    const deps = buildDeps({
      matchRepo: { findById: vi.fn().mockResolvedValue(match) },
      dogRepo: { findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]) },
      walkRepo: { findByMatchId: vi.fn().mockResolvedValue(walks) },
    });
    const execute = createListWalksByMatch(deps);

    const result = await execute('user-1', 'match-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.walks).toHaveLength(2);
  });

  it('fails with 404 when match not found or inactive', async () => {
    const deps = buildDeps({
      matchRepo: { findById: vi.fn().mockResolvedValue(null) },
    });
    const execute = createListWalksByMatch(deps);

    const result = await execute('user-1', 'match-missing');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.status).toBe(404);
  });
});
