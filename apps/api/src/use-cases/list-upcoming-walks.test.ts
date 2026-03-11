import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildWalk, buildWalkRepo } from '../test-utils/builders.js';
import { createListUpcomingWalks } from './list-upcoming-walks.js';

describe('listUpcomingWalks', () => {
  it('returns upcoming walks for a user', async () => {
    const walks = [buildWalk(), buildWalk({ id: 'walk-2' })];
    const walkRepo = buildWalkRepo({ findUpcoming: vi.fn().mockResolvedValue(walks) });
    const listUpcomingWalks = createListUpcomingWalks({ walkRepo });

    const result = await listUpcomingWalks('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.walks).toHaveLength(2);
    expect(walkRepo.findUpcoming).toHaveBeenCalledWith('user-1');
  });

  it('returns empty array when no upcoming walks', async () => {
    const walkRepo = buildWalkRepo({ findUpcoming: vi.fn().mockResolvedValue([]) });
    const listUpcomingWalks = createListUpcomingWalks({ walkRepo });

    const result = await listUpcomingWalks('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.walks).toHaveLength(0);
  });
});
