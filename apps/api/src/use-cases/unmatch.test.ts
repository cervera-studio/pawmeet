import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildMatch, buildMatchRepo } from '../test-utils/builders.js';
import { createUnmatch } from './unmatch.js';

describe('unmatch', () => {
  it('soft-deletes a match when user owns one of the dogs', async () => {
    const match = buildMatch();
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog()]),
    });
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
      softDelete: vi.fn().mockResolvedValue(undefined),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Match annullato');
    expect(matchRepo.softDelete).toHaveBeenCalledWith('match-1');
  });

  it('fails with MATCH_NOT_FOUND when match does not exist', async () => {
    const dogRepo = buildDogRepo();
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with MATCH_NOT_FOUND when match is inactive', async () => {
    const match = buildMatch({ isActive: false });
    const dogRepo = buildDogRepo();
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
  });

  it('fails when user does not own either dog in the match', async () => {
    const match = buildMatch({ dogAId: 'dog-x', dogBId: 'dog-y' });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(matchRepo.softDelete).not.toHaveBeenCalled();
  });
});
