import { USER_LEVEL } from '@dogwalk/config';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createGetXpSummary } from './get-xp-summary.js';

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

describe('getXpSummary', () => {
  it('returns Cucciolo level for 0 XP', async () => {
    const repo = buildGamificationRepo({ getTotalXp: vi.fn().mockResolvedValue(0) });
    const getXpSummary = createGetXpSummary({ gamificationRepo: repo });

    const result = await getXpSummary('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.totalXp).toBe(0);
    expect(result.data.level).toBe(USER_LEVEL.CUCCIOLO);
    expect(result.data.xpToNextLevel).toBe(100);
  });

  it('returns Esploratore level for 250 XP', async () => {
    const repo = buildGamificationRepo({ getTotalXp: vi.fn().mockResolvedValue(250) });
    const getXpSummary = createGetXpSummary({ gamificationRepo: repo });

    const result = await getXpSummary('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.level).toBe(USER_LEVEL.ESPLORATORE);
    expect(result.data.xpToNextLevel).toBe(250);
  });

  it('returns Leggenda level for 2000+ XP with no next level', async () => {
    const repo = buildGamificationRepo({ getTotalXp: vi.fn().mockResolvedValue(5000) });
    const getXpSummary = createGetXpSummary({ gamificationRepo: repo });

    const result = await getXpSummary('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.level).toBe(USER_LEVEL.LEGGENDA);
    expect(result.data.xpToNextLevel).toBeNull();
  });
});
