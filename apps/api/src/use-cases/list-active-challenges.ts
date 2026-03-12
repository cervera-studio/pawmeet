import type { ChallengeWithProgress, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** List active challenges with user progress. */
export function createListActiveChallenges({ gamificationRepo }: Deps) {
  return async (userId: string): Promise<Result<{ challenges: ChallengeWithProgress[] }>> => {
    const now = new Date();
    const activeChallenges = await gamificationRepo.findActiveChallenges(now);

    if (activeChallenges.length === 0) {
      return succeed({ challenges: [] });
    }

    const challengeIds = activeChallenges.map((c) => c.id);
    const userProgress = await gamificationRepo.findUserChallenges(userId, challengeIds);
    const progressMap = new Map(userProgress.map((uc) => [uc.challengeId, uc]));

    const challenges: ChallengeWithProgress[] = activeChallenges.map((challenge) => {
      const userChallenge = progressMap.get(challenge.id);
      return {
        ...challenge,
        progress: userChallenge?.progress ?? 0,
        completedAt: userChallenge?.completedAt ?? null,
      };
    });

    return succeed({ challenges });
  };
}
