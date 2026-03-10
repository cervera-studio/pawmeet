import { CHALLENGE_TYPE, XP_ACTION } from '@dogwalk/config';
import type { Challenge, UserChallenge } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createUpdateChallengeProgress } from './update-challenge-progress.js';

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
    upsertUserChallenge: vi.fn().mockResolvedValue(buildUserChallenge()),
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

describe('updateChallengeProgress', () => {
  it('increments progress on an active challenge', async () => {
    const challenge = buildChallenge({ targetValue: 5 });
    const repo = buildGamificationRepo({
      findActiveChallengesByType: vi.fn().mockResolvedValue([challenge]),
      findUserChallenges: vi.fn().mockResolvedValue([buildUserChallenge({ progress: 2 })]),
      upsertUserChallenge: vi.fn().mockResolvedValue(buildUserChallenge({ progress: 3 })),
    });
    const awardXp = vi.fn().mockResolvedValue(undefined);
    const updateProgress = createUpdateChallengeProgress({
      gamificationRepo: repo,
      awardXp,
    });

    const result = await updateProgress('user-1', CHALLENGE_TYPE.WALK_COUNT, 1);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.updated).toHaveLength(1);
    expect(repo.upsertUserChallenge).toHaveBeenCalledWith('user-1', 'challenge-1', 3, null);
    expect(awardXp).not.toHaveBeenCalled();
  });

  it('awards XP when challenge is completed', async () => {
    const challenge = buildChallenge({ targetValue: 5, id: 'c-1' });
    const repo = buildGamificationRepo({
      findActiveChallengesByType: vi.fn().mockResolvedValue([challenge]),
      findUserChallenges: vi.fn().mockResolvedValue([buildUserChallenge({ progress: 4 })]),
      upsertUserChallenge: vi
        .fn()
        .mockResolvedValue(buildUserChallenge({ progress: 5, completedAt: new Date() })),
    });
    const awardXp = vi.fn().mockResolvedValue(undefined);
    const updateProgress = createUpdateChallengeProgress({
      gamificationRepo: repo,
      awardXp,
    });

    const result = await updateProgress('user-1', CHALLENGE_TYPE.WALK_COUNT, 1);

    expect(isSuccess(result)).toBe(true);
    expect(awardXp).toHaveBeenCalledWith('user-1', XP_ACTION.CHALLENGE_COMPLETED, {
      challengeId: 'c-1',
      challengeType: CHALLENGE_TYPE.WALK_COUNT,
    });
  });

  it('skips already completed challenges', async () => {
    const challenge = buildChallenge({ targetValue: 5 });
    const repo = buildGamificationRepo({
      findActiveChallengesByType: vi.fn().mockResolvedValue([challenge]),
      findUserChallenges: vi
        .fn()
        .mockResolvedValue([
          buildUserChallenge({ progress: 5, completedAt: new Date('2026-03-10') }),
        ]),
    });
    const awardXp = vi.fn().mockResolvedValue(undefined);
    const updateProgress = createUpdateChallengeProgress({
      gamificationRepo: repo,
      awardXp,
    });

    const result = await updateProgress('user-1', CHALLENGE_TYPE.WALK_COUNT, 1);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.updated).toHaveLength(0);
    expect(repo.upsertUserChallenge).not.toHaveBeenCalled();
  });
});
