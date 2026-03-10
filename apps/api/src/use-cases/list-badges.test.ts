import { BADGE_TYPE, type Badge, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { BadgeRepository } from '../ports/badge-repository.js';
import { createListBadges } from './list-badges.js';

function buildBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    id: 'badge-1',
    dogId: 'dog-1',
    type: BADGE_TYPE.FIRST_MEETING,
    awardedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

function buildBadgeRepo(overrides: Partial<BadgeRepository> = {}): BadgeRepository {
  return {
    findByDog: vi.fn().mockResolvedValue([]),
    award: vi.fn(),
    hasBadge: vi.fn(),
    ...overrides,
  };
}

describe('listBadges', () => {
  it('returns badges for a dog', async () => {
    const badges = [
      buildBadge({ id: 'badge-1', type: BADGE_TYPE.FIRST_MEETING }),
      buildBadge({ id: 'badge-2', type: BADGE_TYPE.REGULAR_WALKER }),
    ];
    const badgeRepo = buildBadgeRepo({
      findByDog: vi.fn().mockResolvedValue(badges),
    });
    const listBadges = createListBadges({ badgeRepo });

    const result = await listBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.badges).toHaveLength(2);
    expect(result.data.badges[0].type).toBe(BADGE_TYPE.FIRST_MEETING);
    expect(result.data.badges[1].type).toBe(BADGE_TYPE.REGULAR_WALKER);
    expect(badgeRepo.findByDog).toHaveBeenCalledWith('dog-1');
  });

  it('returns empty array when dog has no badges', async () => {
    const badgeRepo = buildBadgeRepo();
    const listBadges = createListBadges({ badgeRepo });

    const result = await listBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.badges).toHaveLength(0);
  });
});
