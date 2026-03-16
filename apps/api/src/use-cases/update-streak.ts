import type { Result, Streak } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** Update a user's streak after an activity. Returns the streak and whether it was broken. */
export function createUpdateStreak({ gamificationRepo }: Deps) {
  return async (
    userId: string,
    type: string,
  ): Promise<Result<{ streak: Streak; broken: boolean }>> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await gamificationRepo.getStreak(userId, type);

    if (!existing) {
      const streak = await gamificationRepo.upsertStreak(userId, type, {
        currentLength: 1,
        longestLength: 1,
        lastActivityDate: today,
      });
      return succeed({ streak, broken: false });
    }

    const lastActivity = new Date(existing.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - lastActivity.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Same day — no-op
    if (diffDays === 0) {
      return succeed({ streak: existing, broken: false });
    }

    // Consecutive day — increment
    if (diffDays === 1) {
      const newLength = existing.currentLength + 1;
      const longestLength = Math.max(newLength, existing.longestLength);
      const streak = await gamificationRepo.upsertStreak(userId, type, {
        currentLength: newLength,
        longestLength,
        lastActivityDate: today,
      });
      return succeed({ streak, broken: false });
    }

    // Gap — streak broken, reset to 1
    const streak = await gamificationRepo.upsertStreak(userId, type, {
      currentLength: 1,
      longestLength: existing.longestLength,
      lastActivityDate: today,
    });
    return succeed({ streak, broken: true });
  };
}
