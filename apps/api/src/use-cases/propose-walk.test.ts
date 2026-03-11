import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildMatch,
  buildMatchRepo,
  buildWalk,
  buildWalkRepo,
} from '../test-utils/builders.js';
import { createProposeWalk } from './propose-walk.js';

const futureDate = new Date('2027-06-15T10:00:00Z');

describe('proposeWalk', () => {
  it('creates a walk proposal when user is a match participant', async () => {
    const match = buildMatch();
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const walkRepo = buildWalkRepo({ create: vi.fn().mockResolvedValue(buildWalk()) });
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: futureDate,
      durationMin: 30,
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.walkId).toBe('walk-1');
    expect(walkRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match-1',
        createdBy: 'user-1',
        status: 'pending',
      }),
    );
  });

  it('fails when match does not exist', async () => {
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(null) });
    const dogRepo = buildDogRepo();
    const walkRepo = buildWalkRepo();
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: futureDate,
      durationMin: 30,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
  });

  it('fails when user is not a participant in the match', async () => {
    const match = buildMatch({ dogAId: 'dog-x', dogBId: 'dog-y' });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const walkRepo = buildWalkRepo();
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: futureDate,
      durationMin: 30,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(walkRepo.create).not.toHaveBeenCalled();
  });

  it('fails when scheduledAt is in the past', async () => {
    const match = buildMatch();
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const walkRepo = buildWalkRepo();
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: new Date('2020-01-01'),
      durationMin: 30,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_INVALID_DATE');
    expect(walkRepo.create).not.toHaveBeenCalled();
  });
});
