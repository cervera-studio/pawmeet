import type { Achievement, Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** List all achievements for a given user. */
export function createListAchievements({ gamificationRepo }: Deps) {
  return async (userId: string): Promise<Result<{ achievements: Achievement[] }>> => {
    const achievements = await gamificationRepo.findAchievementsByUser(userId);
    return succeed({ achievements });
  };
}
