import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo } from '../test-utils/builders.js';
import { createListFriends } from './list-friends.js';

describe('listFriends', () => {
  it('returns the list from followRepo.listFriends', async () => {
    const friends = [{ userId: 'u-2', displayName: 'Luca', avatarUrl: null }];
    const followRepo = buildFollowRepo({
      listFriends: vi.fn().mockResolvedValue(friends),
    });
    const listFriends = createListFriends({ followRepo });

    const result = await listFriends('user-1', 20, 0);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(friends);
    expect(followRepo.listFriends).toHaveBeenCalledWith('user-1', { limit: 20, offset: 0 });
  });
});
