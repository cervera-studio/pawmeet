import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo } from '../test-utils/builders.js';
import { createUnblockUser } from './unblock-user.js';

describe('unblockUser', () => {
  it('successfully unblocks a user', async () => {
    const followRepo = buildFollowRepo({
      unblock: vi.fn().mockResolvedValue(true),
    });
    const unblockUser = createUnblockUser({ followRepo });

    const result = await unblockUser('user-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual({ unblocked: true });
    expect(followRepo.unblock).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('fails with NOT_BLOCKED when user is not blocked', async () => {
    const followRepo = buildFollowRepo({
      unblock: vi.fn().mockResolvedValue(false),
    });
    const unblockUser = createUnblockUser({ followRepo });

    const result = await unblockUser('user-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_BLOCKED');
    expect(result.error.status).toBe(404);
  });
});
