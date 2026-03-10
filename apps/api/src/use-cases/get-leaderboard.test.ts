import { LEADERBOARD_TYPE, USER_LEVEL } from '@dogwalk/config';
import type { LeaderboardEntry } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createGetLeaderboard } from './get-leaderboard.js';

function buildLeaderboardEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    userId: 'user-1',
    displayName: 'Mario',
    totalXp: 500,
    rank: 1,
    level: USER_LEVEL.ALPHA,
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

describe('getLeaderboard', () => {
  it('returns ranked entries for all-time leaderboard', async () => {
    const entries = [
      buildLeaderboardEntry({ rank: 1, totalXp: 1000 }),
      buildLeaderboardEntry({ userId: 'user-2', rank: 2, totalXp: 500 }),
    ];
    const repo = buildGamificationRepo({
      getLeaderboard: vi.fn().mockResolvedValue(entries),
    });
    const getLeaderboard = createGetLeaderboard({ gamificationRepo: repo });

    const result = await getLeaderboard(LEADERBOARD_TYPE.ALL_TIME, 20);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.entries).toHaveLength(2);
    expect(result.data.entries[0].rank).toBe(1);
    expect(repo.getLeaderboard).toHaveBeenCalledWith(LEADERBOARD_TYPE.ALL_TIME, 20);
  });

  it('returns empty entries when no XP transactions exist', async () => {
    const repo = buildGamificationRepo({
      getLeaderboard: vi.fn().mockResolvedValue([]),
    });
    const getLeaderboard = createGetLeaderboard({ gamificationRepo: repo });

    const result = await getLeaderboard(LEADERBOARD_TYPE.WEEKLY, 10);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.entries).toHaveLength(0);
  });

  it('passes correct type and limit to repository', async () => {
    const repo = buildGamificationRepo();
    const getLeaderboard = createGetLeaderboard({ gamificationRepo: repo });

    await getLeaderboard(LEADERBOARD_TYPE.WEEKLY, 5);

    expect(repo.getLeaderboard).toHaveBeenCalledWith(LEADERBOARD_TYPE.WEEKLY, 5);
  });
});
