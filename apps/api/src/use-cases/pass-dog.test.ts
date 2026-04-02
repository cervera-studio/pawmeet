import { SWIPE_DAILY_LIMIT } from '@pawmeet/config';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildMatchRepo } from '../test-utils/builders.js';
import { createPassDog } from './pass-dog.js';

function buildDeps() {
  return {
    dogRepo: buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    }),
    matchRepo: buildMatchRepo({
      countDailySwipes: vi.fn().mockResolvedValue(0),
      findSwipe: vi.fn().mockResolvedValue(null),
      createSwipe: vi.fn().mockResolvedValue({ id: 'swipe-1' }),
    }),
  };
}

describe('createPassDog', () => {
  it('records a pass swipe', async () => {
    const deps = buildDeps();
    const passDog = createPassDog(deps);

    const result = await passDog('user-1', 'dog-1', 'dog-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passed');
    expect(deps.matchRepo.createSwipe).toHaveBeenCalledWith({
      swiperDogId: 'dog-1',
      swipedDogId: 'dog-2',
      direction: 'pass',
    });
  });

  it('fails with 404 when dog not owned', async () => {
    const deps = buildDeps();
    deps.dogRepo.findByIdAndOwner = vi.fn().mockResolvedValue(null);
    const passDog = createPassDog(deps);

    const result = await passDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails with 429 when daily swipe limit reached', async () => {
    const deps = buildDeps();
    deps.matchRepo.countDailySwipes = vi.fn().mockResolvedValue(SWIPE_DAILY_LIMIT);
    const passDog = createPassDog(deps);

    const result = await passDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('SWIPE_LIMIT_REACHED');
    expect(result.error.status).toBe(429);
  });

  it('fails with 409 when already swiped', async () => {
    const deps = buildDeps();
    deps.matchRepo.findSwipe = vi.fn().mockResolvedValue({ id: 'existing-swipe' });
    const passDog = createPassDog(deps);

    const result = await passDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_SWIPED');
    expect(result.error.status).toBe(409);
  });
});
