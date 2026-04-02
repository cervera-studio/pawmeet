import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo } from '../test-utils/builders.js';
import { createListFollowers } from './list-followers.js';

describe('createListFollowers', () => {
  it('returns paginated followers', async () => {
    const followers = [{ id: 'u-2', displayName: 'Anna', avatarUrl: null }];
    const deps = {
      followRepo: buildFollowRepo({
        listFollowers: vi.fn().mockResolvedValue(followers),
      }),
    };
    const listFollowers = createListFollowers(deps);

    const result = await listFollowers('user-1', 20, 0);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(followers);
    expect(deps.followRepo.listFollowers).toHaveBeenCalledWith('user-1', { limit: 20, offset: 0 });
  });
});
