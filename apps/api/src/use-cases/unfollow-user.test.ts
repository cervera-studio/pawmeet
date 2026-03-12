import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo } from '../test-utils/builders.js';
import { createUnfollowUser } from './unfollow-user.js';

describe('unfollowUser', () => {
  it('successfully unfollows a user', async () => {
    const followRepo = buildFollowRepo({
      unfollow: vi.fn().mockResolvedValue(true),
    });
    const unfollowUser = createUnfollowUser({ followRepo });

    const result = await unfollowUser('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual({ unfollowed: true });
    expect(followRepo.unfollow).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('fails with SELF_UNFOLLOW when unfollowing yourself', async () => {
    const followRepo = buildFollowRepo();
    const unfollowUser = createUnfollowUser({ followRepo });

    const result = await unfollowUser('user-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('SELF_UNFOLLOW');
    expect(result.error.status).toBe(400);
  });

  it('fails with NOT_FOLLOWING when not following the user', async () => {
    const followRepo = buildFollowRepo({
      unfollow: vi.fn().mockResolvedValue(false),
    });
    const unfollowUser = createUnfollowUser({ followRepo });

    const result = await unfollowUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_FOLLOWING');
    expect(result.error.status).toBe(404);
  });
});
