import { ACHIEVEMENT_TYPE, type AchievementType } from '@dogwalk/config';
import type { Achievement, Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** Check all achievement criteria for a user and unlock any newly earned ones. */
export function createCheckAndUnlockAchievements({ gamificationRepo }: Deps) {
  return async (userId: string): Promise<Result<{ unlocked: Achievement[] }>> => {
    const unlocked: Achievement[] = [];

    const [completedWalks, matchCount, groupEventsJoined, totalDistanceKm] = await Promise.all([
      gamificationRepo.countCompletedWalks(userId),
      gamificationRepo.countMatches(userId),
      gamificationRepo.countGroupEventsJoined(userId),
      gamificationRepo.getTotalWalkDistanceKm(userId),
    ]);

    const criteria: Array<{ type: AchievementType; condition: boolean }> = [
      { type: ACHIEVEMENT_TYPE.FIRST_WALK, condition: completedWalks >= 1 },
      { type: ACHIEVEMENT_TYPE.WALKS_10, condition: completedWalks >= 10 },
      { type: ACHIEVEMENT_TYPE.WALKS_50, condition: completedWalks >= 50 },
      { type: ACHIEVEMENT_TYPE.WALKS_100, condition: completedWalks >= 100 },
      { type: ACHIEVEMENT_TYPE.FIRST_MATCH, condition: matchCount >= 1 },
      { type: ACHIEVEMENT_TYPE.MATCHES_10, condition: matchCount >= 10 },
      { type: ACHIEVEMENT_TYPE.FIRST_GROUP_EVENT, condition: groupEventsJoined >= 1 },
      { type: ACHIEVEMENT_TYPE.SOCIAL_BUTTERFLY, condition: groupEventsJoined >= 10 },
      { type: ACHIEVEMENT_TYPE.MARATHON_WALKER, condition: totalDistanceKm >= 100 },
    ];

    for (const { type, condition } of criteria) {
      if (condition) {
        const alreadyHas = await gamificationRepo.hasAchievement(userId, type);
        if (!alreadyHas) {
          const achievement = await gamificationRepo.unlockAchievement(userId, type);
          unlocked.push(achievement);
        }
      }
    }

    return succeed({ unlocked });
  };
}
