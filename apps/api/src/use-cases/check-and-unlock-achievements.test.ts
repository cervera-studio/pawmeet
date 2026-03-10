import { ACHIEVEMENT_TYPE } from '@dogwalk/config';
import type { Achievement, AchievementType } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createCheckAndUnlockAchievements } from './check-and-unlock-achievements.js';

function buildAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 'ach-1',
    userId: 'user-1',
    type: ACHIEVEMENT_TYPE.FIRST_WALK,
    unlockedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

function buildGamificationRepo(
  overrides: Partial<GamificationRepository> = {},
): GamificationRepository {
  return {
    createXpTransaction: vi.fn(),
    getTotalXp: vi.fn().mockResolvedValue(0),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    findActiveChallenges: vi.fn().mockResolvedValue([]),
    findUserChallenges: vi.fn().mockResolvedValue([]),
    upsertUserChallenge: vi.fn(),
    findActiveChallengesByType: vi.fn().mockResolvedValue([]),
    findAchievementsByUser: vi.fn().mockResolvedValue([]),
    hasAchievement: vi.fn().mockResolvedValue(false),
    unlockAchievement: vi
      .fn()
      .mockImplementation((_userId: string, type: AchievementType) =>
        Promise.resolve(buildAchievement({ type })),
      ),
    countCompletedWalks: vi.fn().mockResolvedValue(0),
    countMatches: vi.fn().mockResolvedValue(0),
    countGroupEventsJoined: vi.fn().mockResolvedValue(0),
    getTotalWalkDistanceKm: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe('checkAndUnlockAchievements', () => {
  it('unlocks FIRST_WALK when user has 1 completed walk', async () => {
    const repo = buildGamificationRepo({
      countCompletedWalks: vi.fn().mockResolvedValue(1),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.FIRST_WALK);
  });

  it('unlocks multiple walk achievements at once', async () => {
    const repo = buildGamificationRepo({
      countCompletedWalks: vi.fn().mockResolvedValue(50),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.FIRST_WALK);
    expect(types).toContain(ACHIEVEMENT_TYPE.WALKS_10);
    expect(types).toContain(ACHIEVEMENT_TYPE.WALKS_50);
    expect(types).not.toContain(ACHIEVEMENT_TYPE.WALKS_100);
  });

  it('does not unlock achievements already earned', async () => {
    const repo = buildGamificationRepo({
      countCompletedWalks: vi.fn().mockResolvedValue(10),
      hasAchievement: vi.fn().mockResolvedValue(true),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.unlocked).toHaveLength(0);
    expect(repo.unlockAchievement).not.toHaveBeenCalled();
  });

  it('unlocks SOCIAL_BUTTERFLY when user joined 10 group events', async () => {
    const repo = buildGamificationRepo({
      countGroupEventsJoined: vi.fn().mockResolvedValue(10),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.FIRST_GROUP_EVENT);
    expect(types).toContain(ACHIEVEMENT_TYPE.SOCIAL_BUTTERFLY);
  });

  it('unlocks MARATHON_WALKER when total distance >= 100km', async () => {
    const repo = buildGamificationRepo({
      getTotalWalkDistanceKm: vi.fn().mockResolvedValue(105),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.MARATHON_WALKER);
  });
});
