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
import { createRespondToWalk } from './respond-to-walk.js';

describe('respondToWalk', () => {
  it('accepts a pending walk when user is the other participant', async () => {
    const walk = buildWalk();
    const match = buildMatch();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(walk),
      updateStatus: vi.fn().mockResolvedValue(buildWalk({ status: 'accepted' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-2', ownerId: 'user-2' })]),
    });
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', true);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passeggiata accettata');
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'accepted');
  });

  it('declines a pending walk', async () => {
    const walk = buildWalk();
    const match = buildMatch();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(walk),
      updateStatus: vi.fn().mockResolvedValue(buildWalk({ status: 'declined' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-2', ownerId: 'user-2' })]),
    });
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', false);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passeggiata rifiutata');
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'declined');
  });

  it('fails when walk does not exist', async () => {
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(null) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', true);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_FOUND');
  });

  it('fails when walk is not pending', async () => {
    const walk = buildWalk({ status: 'accepted' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', true);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_PENDING');
  });

  it('fails when creator tries to respond to own walk', async () => {
    const walk = buildWalk({ createdBy: 'user-1' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-1', 'walk-1', true);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_CANNOT_RESPOND_OWN');
  });
});
