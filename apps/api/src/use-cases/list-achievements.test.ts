import { ACHIEVEMENT_TYPE } from '@dogwalk/config';
import type { Achievement } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createListAchievements } from './list-achievements.js';

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
    unlockAchievement: vi.fn(),
    countCompletedWalks: vi.fn().mockResolvedValue(0),
    countMatches: vi.fn().mockResolvedValue(0),
    countGroupEventsJoined: vi.fn().mockResolvedValue(0),
    getTotalWalkDistanceKm: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe('listAchievements', () => {
  it('returns all achievements for a user', async () => {
    const achievements = [
      buildAchievement({ type: ACHIEVEMENT_TYPE.FIRST_WALK }),
      buildAchievement({ id: 'ach-2', type: ACHIEVEMENT_TYPE.WALKS_10 }),
    ];
    const repo = buildGamificationRepo({
      findAchievementsByUser: vi.fn().mockResolvedValue(achievements),
    });
    const listAchievements = createListAchievements({ gamificationRepo: repo });

    const result = await listAchievements('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.achievements).toHaveLength(2);
  });

  it('returns empty list when user has no achievements', async () => {
    const repo = buildGamificationRepo({
      findAchievementsByUser: vi.fn().mockResolvedValue([]),
    });
    const listAchievements = createListAchievements({ gamificationRepo: repo });

    const result = await listAchievements('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.achievements).toHaveLength(0);
  });

  it('calls repository with correct userId', async () => {
    const repo = buildGamificationRepo();
    const listAchievements = createListAchievements({ gamificationRepo: repo });

    await listAchievements('user-42');

    expect(repo.findAchievementsByUser).toHaveBeenCalledWith('user-42');
  });
});
