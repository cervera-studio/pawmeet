import { BADGE_TYPE, type Badge, type BadgeType, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { BadgeRepository } from '../ports/badge-repository.js';
import type { WalkRepository } from '../ports/walk-repository.js';
import { createCheckAndAwardBadges } from './check-and-award-badges.js';

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
    award: vi
      .fn()
      .mockImplementation((_dogId: string, type: BadgeType) =>
        Promise.resolve(buildBadge({ type })),
      ),
    hasBadge: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function buildWalkRepo(overrides: Partial<WalkRepository> = {}): WalkRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByMatchId: vi.fn(),
    findUpcoming: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    countCompletedForDog: vi.fn().mockResolvedValue(0),
    getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 0, count: 0 }),
    ...overrides,
  };
}

describe('checkAndAwardBadges', () => {
  it('awards FIRST_MEETING when completedWalks >= 1', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(1),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.awarded.map((b) => b.type);
    expect(types).toContain(BADGE_TYPE.FIRST_MEETING);
    expect(badgeRepo.award).toHaveBeenCalledWith('dog-1', BADGE_TYPE.FIRST_MEETING);
  });

  it('awards REGULAR_WALKER when completedWalks >= 5', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(5),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.awarded.map((b) => b.type);
    expect(types).toContain(BADGE_TYPE.REGULAR_WALKER);
  });

  it('awards SUPER_SOCIAL when completedWalks >= 10', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(10),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.awarded.map((b) => b.type);
    expect(types).toContain(BADGE_TYPE.SUPER_SOCIAL);
  });

  it('awards FRIENDLY_DOG when avgRating >= 4.0 and ratingCount >= 3', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(0),
      getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 4.5, count: 3 }),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.awarded.map((b) => b.type);
    expect(types).toContain(BADGE_TYPE.FRIENDLY_DOG);
    expect(badgeRepo.award).toHaveBeenCalledWith('dog-1', BADGE_TYPE.FRIENDLY_DOG);
  });

  it('does not award FRIENDLY_DOG when ratingCount < 3', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(0),
      getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 5.0, count: 2 }),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.awarded).toHaveLength(0);
    expect(badgeRepo.award).not.toHaveBeenCalledWith('dog-1', BADGE_TYPE.FRIENDLY_DOG);
  });

  it('does not award FRIENDLY_DOG when avgRating < 4.0', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(0),
      getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 3.5, count: 5 }),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.awarded).toHaveLength(0);
  });

  it('does not award badges already earned', async () => {
    const badgeRepo = buildBadgeRepo({
      hasBadge: vi.fn().mockResolvedValue(true),
    });
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(10),
      getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 4.5, count: 5 }),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.awarded).toHaveLength(0);
    expect(badgeRepo.award).not.toHaveBeenCalled();
  });

  it('awards multiple badges at once when criteria are met', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(10),
      getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 4.2, count: 3 }),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    // Should award all 4 badges: SUPER_SOCIAL, REGULAR_WALKER, FIRST_MEETING, FRIENDLY_DOG
    expect(result.data.awarded).toHaveLength(4);
    const types = result.data.awarded.map((b) => b.type);
    expect(types).toContain(BADGE_TYPE.FIRST_MEETING);
    expect(types).toContain(BADGE_TYPE.REGULAR_WALKER);
    expect(types).toContain(BADGE_TYPE.SUPER_SOCIAL);
    expect(types).toContain(BADGE_TYPE.FRIENDLY_DOG);
  });

  it('awards no badges when no criteria are met', async () => {
    const badgeRepo = buildBadgeRepo();
    const walkRepo = buildWalkRepo({
      countCompletedForDog: vi.fn().mockResolvedValue(0),
      getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 0, count: 0 }),
    });
    const checkAndAwardBadges = createCheckAndAwardBadges({ badgeRepo, walkRepo });

    const result = await checkAndAwardBadges('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.awarded).toHaveLength(0);
    expect(badgeRepo.award).not.toHaveBeenCalled();
  });
});
