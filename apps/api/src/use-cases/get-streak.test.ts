import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGamificationRepo } from '../test-utils/builders.js';
import { createGetStreak } from './get-streak.js';

function buildDeps(overrides: Partial<Parameters<typeof createGetStreak>[0]> = {}) {
  const gamificationRepo = buildGamificationRepo(overrides.gamificationRepo);
  return { gamificationRepo };
}

describe('getStreak', () => {
  it('returns null when no streak exists', async () => {
    const deps = buildDeps();
    const execute = createGetStreak(deps);

    const result = await execute('user-1', 'daily_walk');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.streak).toBeNull();
  });

  it('returns existing streak', async () => {
    const streak = {
      id: 'streak-1',
      userId: 'user-1',
      type: 'daily_walk',
      currentLength: 5,
      longestLength: 10,
      lastActivityDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const deps = buildDeps({
      gamificationRepo: { getStreak: vi.fn().mockResolvedValue(streak) },
    });
    const execute = createGetStreak(deps);

    const result = await execute('user-1', 'daily_walk');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.streak).toEqual(streak);
  });
});
