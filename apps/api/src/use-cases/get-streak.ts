import type { Result, Streak } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** Get a user's streak by type. Returns null if no streak exists. */
export function createGetStreak({ gamificationRepo }: Deps) {
  return async (userId: string, type: string): Promise<Result<{ streak: Streak | null }>> => {
    const streak = await gamificationRepo.getStreak(userId, type);
    return succeed({ streak });
  };
}
