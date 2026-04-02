import type { Challenge, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import { WEEKLY_CHALLENGE_TEMPLATES } from '../constants/challenges.js';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** Get the next Monday at 00:00 UTC from the given date. */
function getNextMonday(from: Date): Date {
  const date = new Date(from);
  const day = date.getUTCDay();
  // Days until next Monday: if Monday (1) -> 7, if Tuesday (2) -> 6, ..., if Sunday (0) -> 1
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/** Get the Sunday at 23:59:59.999 UTC for the week starting on the given Monday. */
function getSundayEnd(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return sunday;
}

/** Generates 4 weekly challenges (one per CHALLENGE_TYPE) for the upcoming week. */
export function createCreateWeeklyChallenges({ gamificationRepo }: Deps) {
  return async (): Promise<Result<{ challenges: Challenge[] }>> => {
    const now = new Date();
    const startsAt = getNextMonday(now);
    const endsAt = getSundayEnd(startsAt);

    const created: Challenge[] = [];

    for (const template of WEEKLY_CHALLENGE_TEMPLATES) {
      const challenge = await gamificationRepo.createChallenge({
        type: template.type,
        title: template.title,
        description: template.description,
        targetValue: template.targetValue,
        xpReward: template.xpReward,
        startsAt,
        endsAt,
      });
      created.push(challenge);
    }

    return succeed({ challenges: created });
  };
}
