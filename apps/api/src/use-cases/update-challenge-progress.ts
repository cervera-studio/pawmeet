import type { ChallengeType, XpAction } from '@dogwalk/config';
import { XP_ACTION } from '@dogwalk/config';
import type { Result, UserChallenge } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

type AwardXpFn = (
  userId: string,
  action: XpAction,
  metadata?: Record<string, unknown>,
) => Promise<unknown>;

type FullDeps = Deps & {
  awardXp: AwardXpFn;
};

/** Update progress on active challenges of a given type. Awards XP if completed. */
export function createUpdateChallengeProgress({ gamificationRepo, awardXp }: FullDeps) {
  return async (
    userId: string,
    challengeType: ChallengeType,
    incrementBy: number,
  ): Promise<Result<{ updated: UserChallenge[] }>> => {
    const now = new Date();
    const activeChallenges = await gamificationRepo.findActiveChallengesByType(
      challengeType,
      now,
    );

    const updated: UserChallenge[] = [];

    for (const challenge of activeChallenges) {
      // Get current progress
      const existing = await gamificationRepo.findUserChallenges(userId, [challenge.id]);
      const current = existing[0];
      const currentProgress = current?.progress ?? 0;

      // Skip already completed
      if (current?.completedAt) {
        continue;
      }

      const newProgress = currentProgress + incrementBy;
      const isCompleted = newProgress >= challenge.targetValue;
      const completedAt = isCompleted ? now : null;

      const userChallenge = await gamificationRepo.upsertUserChallenge(
        userId,
        challenge.id,
        newProgress,
        completedAt,
      );

      if (isCompleted) {
        await awardXp(userId, XP_ACTION.CHALLENGE_COMPLETED, {
          challengeId: challenge.id,
          challengeType,
        });
      }

      updated.push(userChallenge);
    }

    return succeed({ updated });
  };
}
