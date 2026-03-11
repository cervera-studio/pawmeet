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
import { createCancelWalk } from './cancel-walk.js';

describe('cancelWalk', () => {
  it('cancels a pending walk when user is a participant', async () => {
    const walk = buildWalk({ status: 'pending' });
    const match = buildMatch();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(walk),
      updateStatus: vi.fn().mockResolvedValue(buildWalk({ status: 'cancelled' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passeggiata annullata');
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'cancelled');
  });

  it('cancels an accepted walk', async () => {
    const walk = buildWalk({ status: 'accepted' });
    const match = buildMatch();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(walk),
      updateStatus: vi.fn().mockResolvedValue(buildWalk({ status: 'cancelled' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isSuccess(result)).toBe(true);
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'cancelled');
  });

  it('fails when walk does not exist', async () => {
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(null) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_FOUND');
  });

  it('fails when walk is already completed', async () => {
    const walk = buildWalk({ status: 'completed' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_CANNOT_CANCEL');
  });

  it('fails when user is not a participant', async () => {
    const walk = buildWalk();
    const match = buildMatch({ dogAId: 'dog-x', dogBId: 'dog-y' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(walkRepo.updateStatus).not.toHaveBeenCalled();
  });
});
