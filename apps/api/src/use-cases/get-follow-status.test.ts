import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo } from '../test-utils/builders.js';
import { createGetFollowStatus } from './get-follow-status.js';

describe('getFollowStatus', () => {
  it('returns all false when no relationship exists', async () => {
    const followRepo = buildFollowRepo();
    const getFollowStatus = createGetFollowStatus({ followRepo });

    const result = await getFollowStatus('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual({
      isFollowing: false,
      isFollowedBy: false,
      isFriend: false,
      isBlocked: false,
    });
  });

  it('returns isFollowing true when current user follows target', async () => {
    const followRepo = buildFollowRepo({
      isFollowing: vi
        .fn()
        .mockImplementation((a: string, b: string) =>
          Promise.resolve(a === 'user-1' && b === 'user-2'),
        ),
    });
    const getFollowStatus = createGetFollowStatus({ followRepo });

    const result = await getFollowStatus('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isFollowing).toBe(true);
    expect(result.data.isFollowedBy).toBe(false);
    expect(result.data.isFriend).toBe(false);
  });

  it('returns isFriend true when both follow each other', async () => {
    const followRepo = buildFollowRepo({
      isFollowing: vi.fn().mockResolvedValue(true),
    });
    const getFollowStatus = createGetFollowStatus({ followRepo });

    const result = await getFollowStatus('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isFollowing).toBe(true);
    expect(result.data.isFollowedBy).toBe(true);
    expect(result.data.isFriend).toBe(true);
  });

  it('returns isBlocked true when blocked either way', async () => {
    const followRepo = buildFollowRepo({
      isBlockedEitherWay: vi.fn().mockResolvedValue(true),
    });
    const getFollowStatus = createGetFollowStatus({ followRepo });

    const result = await getFollowStatus('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isBlocked).toBe(true);
  });

  it('calls repository methods with correct argument order', async () => {
    const followRepo = buildFollowRepo();
    const getFollowStatus = createGetFollowStatus({ followRepo });

    await getFollowStatus('user-1', 'user-2');

    // First call: isFollowing(currentUser, target)
    expect(followRepo.isFollowing).toHaveBeenCalledWith('user-1', 'user-2');
    // Second call: isFollowing(target, currentUser) — checks reverse
    expect(followRepo.isFollowing).toHaveBeenCalledWith('user-2', 'user-1');
    expect(followRepo.isBlockedEitherWay).toHaveBeenCalledWith('user-1', 'user-2');
  });
});
