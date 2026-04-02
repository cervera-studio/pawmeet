import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo, buildUserRepo } from '../test-utils/builders.js';
import { createSearchUsers } from './search-users.js';

describe('createSearchUsers', () => {
  it('returns search results filtered by blocks', async () => {
    const deps = {
      userRepo: buildUserRepo({
        searchByName: vi.fn().mockResolvedValue([
          { id: 'u-2', displayName: 'Anna' },
          { id: 'u-3', displayName: 'Marco' },
        ]),
      }),
      followRepo: buildFollowRepo({
        isBlockedEitherWay: vi
          .fn()
          .mockResolvedValueOnce(false) // u-2: not blocked
          .mockResolvedValueOnce(true), // u-3: blocked
      }),
    };
    const searchUsers = createSearchUsers(deps);

    const result = await searchUsers('user-1', 'An', 20, 0);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('u-2');
  });
});
