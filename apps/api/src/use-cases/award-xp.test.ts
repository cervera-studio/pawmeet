import { USER_LEVEL, XP_ACTION, XP_POINTS } from '@dogwalk/config';
import { isSuccess } from '@dogwalk/types';
import type { XpTransaction } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createAwardXp } from './award-xp.js';

function buildXpTransaction(overrides: Partial<XpTransaction> = {}): XpTransaction {
  return {
    id: 'xp-1',
    userId: 'user-1',
    action: XP_ACTION.WALK_COMPLETED,
    points: 50,
    metadata: null,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

function buildGamificationRepo(
  overrides: Partial<GamificationRepository> = {},
): GamificationRepository {
  return {
    createXpTransaction: vi.fn().mockResolvedValue(buildXpTransaction()),
    getTotalXp: vi.fn().mockResolvedValue(0),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    findActiveChallenges: vi.fn().mockResolvedValue([]),
    findUserChallenges: vi.fn().mockResolvedValue([]),
    upsertUserChallenge: vi.fn().mockResolvedValue({}),
    findActiveChallengesByType: vi.fn().mockResolvedValue([]),
    findAchievementsByUser: vi.fn().mockResolvedValue([]),
    hasAchievement: vi.fn().mockResolvedValue(false),
    unlockAchievement: vi.fn().mockResolvedValue({}),
    countCompletedWalks: vi.fn().mockResolvedValue(0),
    countMatches: vi.fn().mockResolvedValue(0),
    countGroupEventsJoined: vi.fn().mockResolvedValue(0),
    getTotalWalkDistanceKm: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe('awardXp', () => {
  it('creates an XP transaction with correct points for the action', async () => {
    const repo = buildGamificationRepo({
      getTotalXp: vi.fn().mockResolvedValue(50),
    });
    const awardXp = createAwardXp({ gamificationRepo: repo });

    const result = await awardXp('user-1', XP_ACTION.WALK_COMPLETED);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.xpAwarded).toBe(XP_POINTS[XP_ACTION.WALK_COMPLETED]);
    expect(repo.createXpTransaction).toHaveBeenCalledWith(
      'user-1',
      XP_ACTION.WALK_COMPLETED,
      50,
      undefined,
    );
  });

  it('returns correct level for accumulated XP', async () => {
    const repo = buildGamificationRepo({
      getTotalXp: vi.fn().mockResolvedValue(150),
    });
    const awardXp = createAwardXp({ gamificationRepo: repo });

    const result = await awardXp('user-1', XP_ACTION.MATCH_MADE);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.summary.totalXp).toBe(150);
    expect(result.data.summary.level).toBe(USER_LEVEL.ESPLORATORE);
  });

  it('passes metadata through to the transaction', async () => {
    const repo = buildGamificationRepo({
      getTotalXp: vi.fn().mockResolvedValue(10),
    });
    const awardXp = createAwardXp({ gamificationRepo: repo });
    const metadata = { walkId: 'walk-123' };

    await awardXp('user-1', XP_ACTION.FEEDBACK_GIVEN, metadata);

    expect(repo.createXpTransaction).toHaveBeenCalledWith(
      'user-1',
      XP_ACTION.FEEDBACK_GIVEN,
      XP_POINTS[XP_ACTION.FEEDBACK_GIVEN],
      metadata,
    );
  });
});
