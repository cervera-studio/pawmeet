import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo } from '../test-utils/builders.js';
import { createListFollowing } from './list-following.js';

describe('listFollowing', () => {
  it('returns the list from followRepo.listFollowing', async () => {
    const following = [{ userId: 'u-2', displayName: 'Luca', avatarUrl: null }];
    const followRepo = buildFollowRepo({
      listFollowing: vi.fn().mockResolvedValue(following),
    });
    const listFollowing = createListFollowing({ followRepo });

    const result = await listFollowing('user-1', 20, 0);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(following);
    expect(followRepo.listFollowing).toHaveBeenCalledWith('user-1', { limit: 20, offset: 0 });
  });
});
