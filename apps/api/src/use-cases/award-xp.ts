import type { XpAction } from '@dogwalk/config';
import { XP_POINTS, computeLevelFromXp } from '@dogwalk/config';
import type { Result, XpSummary } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** Award XP for a completed action. Returns updated XP summary. */
export function createAwardXp({ gamificationRepo }: Deps) {
  return async (
    userId: string,
    action: XpAction,
    metadata?: Record<string, unknown>,
  ): Promise<Result<{ xpAwarded: number; summary: XpSummary }>> => {
    const points = XP_POINTS[action];

    await gamificationRepo.createXpTransaction(userId, action, points, metadata);

    const totalXp = await gamificationRepo.getTotalXp(userId);
    const { level, xpToNextLevel } = computeLevelFromXp(totalXp);

    return succeed({
      xpAwarded: points,
      summary: { totalXp, level, xpToNextLevel },
    });
  };
}
