import { ACHIEVEMENT_TYPE } from '@dogwalk/config';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGamificationRepo } from '../test-utils/builders.js';
import { createCheckAndUnlockAchievements } from './check-and-unlock-achievements.js';

describe('checkAndUnlockAchievements', () => {
  it('unlocks FIRST_WALK when user has 1 completed walk', async () => {
    const repo = buildGamificationRepo({
      countCompletedWalks: vi.fn().mockResolvedValue(1),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.FIRST_WALK);
  });

  it('unlocks multiple walk achievements at once', async () => {
    const repo = buildGamificationRepo({
      countCompletedWalks: vi.fn().mockResolvedValue(50),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.FIRST_WALK);
    expect(types).toContain(ACHIEVEMENT_TYPE.WALKS_10);
    expect(types).toContain(ACHIEVEMENT_TYPE.WALKS_50);
    expect(types).not.toContain(ACHIEVEMENT_TYPE.WALKS_100);
  });

  it('does not unlock achievements already earned', async () => {
    const repo = buildGamificationRepo({
      countCompletedWalks: vi.fn().mockResolvedValue(10),
      hasAchievement: vi.fn().mockResolvedValue(true),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.unlocked).toHaveLength(0);
    expect(repo.unlockAchievement).not.toHaveBeenCalled();
  });

  it('unlocks SOCIAL_BUTTERFLY when user joined 10 group events', async () => {
    const repo = buildGamificationRepo({
      countGroupEventsJoined: vi.fn().mockResolvedValue(10),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.FIRST_GROUP_EVENT);
    expect(types).toContain(ACHIEVEMENT_TYPE.SOCIAL_BUTTERFLY);
  });

  it('unlocks MARATHON_WALKER when total distance >= 100km', async () => {
    const repo = buildGamificationRepo({
      getTotalWalkDistanceKm: vi.fn().mockResolvedValue(105),
    });
    const checkAndUnlock = createCheckAndUnlockAchievements({ gamificationRepo: repo });

    const result = await checkAndUnlock('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const types = result.data.unlocked.map((a) => a.type);
    expect(types).toContain(ACHIEVEMENT_TYPE.MARATHON_WALKER);
  });
});
