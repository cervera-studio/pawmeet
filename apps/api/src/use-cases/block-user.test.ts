import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildFollowRepo,
  buildUser,
  buildUserBlock,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createBlockUser } from './block-user.js';

describe('blockUser', () => {
  it('successfully blocks a user and returns UserBlock', async () => {
    const block = buildUserBlock({ blockerId: 'user-1', blockedId: 'user-2' });
    const followRepo = buildFollowRepo({
      isBlocked: vi.fn().mockResolvedValue(false),
      block: vi.fn().mockResolvedValue(block),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'user-2' })),
    });
    const blockUser = createBlockUser({ followRepo, userRepo });

    const result = await blockUser('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(block);
    expect(followRepo.block).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('fails with SELF_BLOCK when blocking yourself', async () => {
    const followRepo = buildFollowRepo();
    const userRepo = buildUserRepo();
    const blockUser = createBlockUser({ followRepo, userRepo });

    const result = await blockUser('user-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('SELF_BLOCK');
    expect(result.error.status).toBe(400);
  });

  it('fails with USER_NOT_FOUND when target does not exist', async () => {
    const followRepo = buildFollowRepo();
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const blockUser = createBlockUser({ followRepo, userRepo });

    const result = await blockUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with ALREADY_BLOCKED when user is already blocked', async () => {
    const followRepo = buildFollowRepo({
      isBlocked: vi.fn().mockResolvedValue(true),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'user-2' })),
    });
    const blockUser = createBlockUser({ followRepo, userRepo });

    const result = await blockUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_BLOCKED');
    expect(result.error.status).toBe(409);
  });
});
