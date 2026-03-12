import { computeLevelFromXp } from '@pawmeet/config';
import type { Result, XpSummary } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** Get XP summary for a user: total XP, current level, XP to next level. */
export function createGetXpSummary({ gamificationRepo }: Deps) {
  return async (userId: string): Promise<Result<XpSummary>> => {
    const totalXp = await gamificationRepo.getTotalXp(userId);
    const { level, xpToNextLevel } = computeLevelFromXp(totalXp);

    return succeed({ totalXp, level, xpToNextLevel });
  };
}
