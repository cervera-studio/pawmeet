import { CHALLENGE_TYPE } from '@dogwalk/config';
import type { Challenge, UserChallenge } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createListActiveChallenges } from './list-active-challenges.js';

function buildChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'challenge-1',
    type: CHALLENGE_TYPE.WALK_COUNT,
    title: 'Cammina 5 volte',
    description: 'Completa 5 passeggiate questa settimana',
    targetValue: 5,
    xpReward: 100,
    startsAt: new Date('2026-03-01'),
    endsAt: new Date('2026-03-31'),
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

function buildUserChallenge(overrides: Partial<UserChallenge> = {}): UserChallenge {
  return {
    id: 'uc-1',
    userId: 'user-1',
    challengeId: 'challenge-1',
    progress: 0,
    completedAt: null,
    createdAt: new Date('2026-03-05'),
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

describe('listActiveChallenges', () => {
  it('returns active challenges with user progress', async () => {
    const challenge = buildChallenge();
    const userChallenge = buildUserChallenge({ progress: 3 });
    const repo = buildGamificationRepo({
      findActiveChallenges: vi.fn().mockResolvedValue([challenge]),
      findUserChallenges: vi.fn().mockResolvedValue([userChallenge]),
    });
    const listActiveChallenges = createListActiveChallenges({ gamificationRepo: repo });

    const result = await listActiveChallenges('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.challenges).toHaveLength(1);
    expect(result.data.challenges[0].progress).toBe(3);
    expect(result.data.challenges[0].completedAt).toBeNull();
  });

  it('returns empty list when no challenges are active', async () => {
    const repo = buildGamificationRepo({
      findActiveChallenges: vi.fn().mockResolvedValue([]),
    });
    const listActiveChallenges = createListActiveChallenges({ gamificationRepo: repo });

    const result = await listActiveChallenges('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.challenges).toHaveLength(0);
  });

  it('returns 0 progress for challenges user has not started', async () => {
    const challenge = buildChallenge({ id: 'challenge-2' });
    const repo = buildGamificationRepo({
      findActiveChallenges: vi.fn().mockResolvedValue([challenge]),
      findUserChallenges: vi.fn().mockResolvedValue([]),
    });
    const listActiveChallenges = createListActiveChallenges({ gamificationRepo: repo });

    const result = await listActiveChallenges('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.challenges[0].progress).toBe(0);
  });
});
