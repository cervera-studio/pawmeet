import { CHALLENGE_TYPE, XP_ACTION } from '@dogwalk/config';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildChallenge,
  buildGamificationRepo,
  buildUserChallenge,
} from '../test-utils/builders.js';
import { createUpdateChallengeProgress } from './update-challenge-progress.js';

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
