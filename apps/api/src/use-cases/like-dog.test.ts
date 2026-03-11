import { SWIPE_DAILY_LIMIT } from '@dogwalk/config';
import type { Swipe } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildMatch,
  buildMatchRepo,
  buildNotificationService,
  buildSwipe,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createLikeDog } from './like-dog.js';

describe('likeDog', () => {
  it('records a like and returns isMatch false when no reciprocal', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo({
      countDailySwipes: vi.fn().mockResolvedValue(0),
      findSwipe: vi.fn().mockResolvedValue(null),
      findReciprocalLike: vi.fn().mockResolvedValue(null),
      createSwipe: vi.fn().mockResolvedValue({} as Swipe),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(buildUser()) });
    const notificationService = buildNotificationService();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo, notificationService });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isMatch).toBe(false);
    expect(result.data.match).toBeUndefined();
    expect(matchRepo.createSwipe).toHaveBeenCalledWith({
      swiperDogId: 'dog-1',
      swipedDogId: 'dog-2',
      direction: 'like',
    });
  });

  it('creates a match when there is a reciprocal like', async () => {
    const match = buildMatch();
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo({
      countDailySwipes: vi.fn().mockResolvedValue(0),
      findSwipe: vi.fn().mockResolvedValue(null),
      findReciprocalLike: vi.fn().mockResolvedValue(buildSwipe()),
      createSwipe: vi.fn().mockResolvedValue({} as Swipe),
      create: vi.fn().mockResolvedValue(match),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(buildUser()) });
    const notificationService = buildNotificationService();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo, notificationService });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isMatch).toBe(true);
    expect(result.data.match).toEqual(match);
    expect(matchRepo.create).toHaveBeenCalledWith({
      dogAId: 'dog-1',
      dogBId: 'dog-2',
      compatibilityScore: 0,
    });
  });

  it('fails with DOG_NOT_FOUND when user does not own the dog', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(null),
    });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo();
    const notificationService = buildNotificationService();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo, notificationService });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with SWIPE_LIMIT_REACHED when daily limit exceeded', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo({
      countDailySwipes: vi.fn().mockResolvedValue(SWIPE_DAILY_LIMIT),
    });
    const userRepo = buildUserRepo();
    const notificationService = buildNotificationService();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo, notificationService });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('SWIPE_LIMIT_REACHED');
    expect(result.error.status).toBe(429);
  });

  it('fails with ALREADY_SWIPED when swipe already exists', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo({
      countDailySwipes: vi.fn().mockResolvedValue(0),
      findSwipe: vi.fn().mockResolvedValue(buildSwipe()),
    });
    const userRepo = buildUserRepo();
    const notificationService = buildNotificationService();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo, notificationService });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_SWIPED');
    expect(result.error.status).toBe(409);
  });
});
