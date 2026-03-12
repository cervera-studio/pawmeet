import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildChallenge,
  buildGamificationRepo,
  buildUserChallenge,
} from '../test-utils/builders.js';
import { createListActiveChallenges } from './list-active-challenges.js';

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
