import { describe, expect, it, vi } from 'vitest';
import { buildBadgeRepo, buildGroupEvent, buildGroupEventRepo } from '../test-utils/builders.js';
import { createAwardMainEventBadge } from './award-main-event-badge.js';

function setup(
  overrides: {
    badgeRepo?: Partial<Parameters<typeof createAwardMainEventBadge>[0]['badgeRepo']>;
    groupEventRepo?: Partial<Parameters<typeof createAwardMainEventBadge>[0]['groupEventRepo']>;
  } = {},
) {
  const badgeRepo = buildBadgeRepo(overrides.badgeRepo);
  const groupEventRepo = buildGroupEventRepo({
    findById: vi.fn().mockResolvedValue(buildGroupEvent({ isOfficial: true })),
    ...overrides.groupEventRepo,
  });

  const awardMainEventBadge = createAwardMainEventBadge({
    badgeRepo,
    groupEventRepo,
  });
  return { awardMainEventBadge, badgeRepo, groupEventRepo };
}

describe('awardMainEventBadge', () => {
  it('awards badge for official event', async () => {
    const { awardMainEventBadge, badgeRepo } = setup();
    const result = await awardMainEventBadge('user-1', 'dog-1', 'event-1');
    expect(result.success).toBe(true);
    expect(badgeRepo.award).toHaveBeenCalledWith('dog-1', 'main_event');
  });

  it('returns null if badge already awarded', async () => {
    const { awardMainEventBadge, badgeRepo } = setup({
      badgeRepo: { hasBadge: vi.fn().mockResolvedValue(true) },
    });
    const result = await awardMainEventBadge('user-1', 'dog-1', 'event-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
    expect(badgeRepo.award).not.toHaveBeenCalled();
  });

  it('fails if event is not official', async () => {
    const { awardMainEventBadge } = setup({
      groupEventRepo: {
        findById: vi.fn().mockResolvedValue(buildGroupEvent({ isOfficial: false })),
      },
    });
    const result = await awardMainEventBadge('user-1', 'dog-1', 'event-1');
    expect(result.success).toBe(false);
  });
});
