import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGamificationRepo } from '../test-utils/builders.js';
import { createUpdateStreak } from './update-streak.js';

function buildDeps(overrides: Partial<Parameters<typeof createUpdateStreak>[0]> = {}) {
  const gamificationRepo = buildGamificationRepo(overrides.gamificationRepo);
  return { gamificationRepo };
}

describe('updateStreak', () => {
  it('creates a new streak when none exists', async () => {
    const deps = buildDeps();
    const execute = createUpdateStreak(deps);

    const result = await execute('user-1', 'daily_walk');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.streak.currentLength).toBe(1);
    expect(result.data.broken).toBe(false);
    expect(deps.gamificationRepo.upsertStreak).toHaveBeenCalledWith(
      'user-1',
      'daily_walk',
      expect.objectContaining({ currentLength: 1, longestLength: 1 }),
    );
  });

  it('returns existing streak unchanged on same-day activity', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = {
      id: 'streak-1',
      userId: 'user-1',
      type: 'daily_walk',
      currentLength: 3,
      longestLength: 5,
      lastActivityDate: today,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const deps = buildDeps({
      gamificationRepo: { getStreak: vi.fn().mockResolvedValue(existing) },
    });
    const execute = createUpdateStreak(deps);

    const result = await execute('user-1', 'daily_walk');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.streak).toEqual(existing);
    expect(result.data.broken).toBe(false);
    expect(deps.gamificationRepo.upsertStreak).not.toHaveBeenCalled();
  });

  it('increments streak on consecutive day', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const existing = {
      id: 'streak-1',
      userId: 'user-1',
      type: 'daily_walk',
      currentLength: 3,
      longestLength: 5,
      lastActivityDate: yesterday,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const deps = buildDeps({
      gamificationRepo: { getStreak: vi.fn().mockResolvedValue(existing) },
    });
    const execute = createUpdateStreak(deps);

    const result = await execute('user-1', 'daily_walk');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.streak.currentLength).toBe(4);
    expect(result.data.broken).toBe(false);
  });

  it('resets streak and marks broken on gap > 1 day', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);
    const existing = {
      id: 'streak-1',
      userId: 'user-1',
      type: 'daily_walk',
      currentLength: 7,
      longestLength: 10,
      lastActivityDate: threeDaysAgo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const deps = buildDeps({
      gamificationRepo: { getStreak: vi.fn().mockResolvedValue(existing) },
    });
    const execute = createUpdateStreak(deps);

    const result = await execute('user-1', 'daily_walk');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.streak.currentLength).toBe(1);
    expect(result.data.broken).toBe(true);
    expect(deps.gamificationRepo.upsertStreak).toHaveBeenCalledWith(
      'user-1',
      'daily_walk',
      expect.objectContaining({ currentLength: 1, longestLength: 10 }),
    );
  });
});
