import { ACHIEVEMENT_TYPE } from '@dogwalk/config';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildAchievement, buildGamificationRepo } from '../test-utils/builders.js';
import { createListAchievements } from './list-achievements.js';

describe('listAchievements', () => {
  it('returns all achievements for a user', async () => {
    const achievements = [
      buildAchievement({ type: ACHIEVEMENT_TYPE.FIRST_WALK }),
      buildAchievement({ id: 'ach-2', type: ACHIEVEMENT_TYPE.WALKS_10 }),
    ];
    const repo = buildGamificationRepo({
      findAchievementsByUser: vi.fn().mockResolvedValue(achievements),
    });
    const listAchievements = createListAchievements({ gamificationRepo: repo });

    const result = await listAchievements('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.achievements).toHaveLength(2);
  });

  it('returns empty list when user has no achievements', async () => {
    const repo = buildGamificationRepo({
      findAchievementsByUser: vi.fn().mockResolvedValue([]),
    });
    const listAchievements = createListAchievements({ gamificationRepo: repo });

    const result = await listAchievements('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.achievements).toHaveLength(0);
  });

  it('calls repository with correct userId', async () => {
    const repo = buildGamificationRepo();
    const listAchievements = createListAchievements({ gamificationRepo: repo });

    await listAchievements('user-42');

    expect(repo.findAchievementsByUser).toHaveBeenCalledWith('user-42');
  });
});
