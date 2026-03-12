import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildFollowRepo,
  buildNotificationService,
  buildUser,
  buildUserFollow,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createFollowUser } from './follow-user.js';

describe('followUser', () => {
  it('successfully follows a user and returns UserFollow', async () => {
    const follow = buildUserFollow({ followerId: 'user-1', followingId: 'user-2' });
    const followRepo = buildFollowRepo({
      isBlockedEitherWay: vi.fn().mockResolvedValue(false),
      isFollowing: vi.fn().mockResolvedValue(false),
      follow: vi.fn().mockResolvedValue(follow),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'user-2' })),
    });
    const notificationService = buildNotificationService();
    const followUser = createFollowUser({ followRepo, userRepo, notificationService });

    const result = await followUser('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(follow);
    expect(followRepo.follow).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('fails with SELF_FOLLOW when following yourself', async () => {
    const followRepo = buildFollowRepo();
    const userRepo = buildUserRepo();
    const notificationService = buildNotificationService();
    const followUser = createFollowUser({ followRepo, userRepo, notificationService });

    const result = await followUser('user-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('SELF_FOLLOW');
    expect(result.error.status).toBe(400);
  });

  it('fails with USER_NOT_FOUND when target does not exist', async () => {
    const followRepo = buildFollowRepo();
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const notificationService = buildNotificationService();
    const followUser = createFollowUser({ followRepo, userRepo, notificationService });

    const result = await followUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with USER_NOT_FOUND when target is inactive', async () => {
    const followRepo = buildFollowRepo();
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'user-2', isActive: false })),
    });
    const notificationService = buildNotificationService();
    const followUser = createFollowUser({ followRepo, userRepo, notificationService });

    const result = await followUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with USER_BLOCKED when blocked either way', async () => {
    const followRepo = buildFollowRepo({
      isBlockedEitherWay: vi.fn().mockResolvedValue(true),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'user-2' })),
    });
    const notificationService = buildNotificationService();
    const followUser = createFollowUser({ followRepo, userRepo, notificationService });

    const result = await followUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_BLOCKED');
    expect(result.error.status).toBe(403);
  });

  it('fails with ALREADY_FOLLOWING when already following', async () => {
    const followRepo = buildFollowRepo({
      isBlockedEitherWay: vi.fn().mockResolvedValue(false),
      isFollowing: vi.fn().mockResolvedValue(true),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'user-2' })),
    });
    const notificationService = buildNotificationService();
    const followUser = createFollowUser({ followRepo, userRepo, notificationService });

    const result = await followUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_FOLLOWING');
    expect(result.error.status).toBe(409);
  });

  it('sends notification to target on success (fire-and-forget)', async () => {
    const follower = buildUser({ id: 'user-1', displayName: 'Mario Rossi' });
    const target = buildUser({ id: 'user-2' });
    const followRepo = buildFollowRepo({
      isBlockedEitherWay: vi.fn().mockResolvedValue(false),
      isFollowing: vi.fn().mockResolvedValue(false),
      follow: vi.fn().mockResolvedValue(buildUserFollow()),
    });
    const userRepo = buildUserRepo({
      findById: vi
        .fn()
        .mockResolvedValueOnce(target) // first call: check target exists
        .mockResolvedValueOnce(follower), // second call: get follower for notification
    });
    const notificationService = buildNotificationService();
    const followUser = createFollowUser({ followRepo, userRepo, notificationService });

    const result = await followUser('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    // Allow microtask queue to flush for fire-and-forget
    await vi.advanceTimersToNextTimerAsync().catch(() => {});
    expect(notificationService.send).toHaveBeenCalledWith({
      userId: 'user-2',
      title: 'Nuovo follower!',
      body: 'Mario Rossi ha iniziato a seguirti',
      data: { type: 'new_follower', userId: 'user-1' },
    });
  });
});
