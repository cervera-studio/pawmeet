import type { Achievement, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
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
