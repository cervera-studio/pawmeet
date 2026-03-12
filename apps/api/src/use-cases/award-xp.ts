import type { XpAction } from '@pawmeet/config';
import { computeLevelFromXp, XP_POINTS } from '@pawmeet/config';
import type { Result, XpSummary } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
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
