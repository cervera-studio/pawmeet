import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFollowRepo } from '../test-utils/builders.js';
import { createListBlocked } from './list-blocked.js';

describe('createListBlocked', () => {
  it('returns paginated blocked users', async () => {
    const deps = {
      followRepo: buildFollowRepo({
        listBlocked: vi.fn().mockResolvedValue([]),
      }),
    };
    const listBlocked = createListBlocked(deps);

    const result = await listBlocked('user-1', 20, 0);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual([]);
    expect(deps.followRepo.listBlocked).toHaveBeenCalledWith('user-1', { limit: 20, offset: 0 });
  });
});
