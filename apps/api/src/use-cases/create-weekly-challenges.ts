import { CHALLENGE_TYPE } from '@pawmeet/config';
import type { Challenge, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

const WEEKLY_TEMPLATES = [
  {
    type: CHALLENGE_TYPE.WALK_COUNT,
    title: 'Completa 5 passeggiate',
    description: 'Porta il tuo cane a fare 5 passeggiate questa settimana',
    targetValue: 5,
    xpReward: 100,
  },
  {
    type: CHALLENGE_TYPE.WALK_DISTANCE_KM,
    title: 'Cammina 10 km',
    description: 'Percorri un totale di 10 km con il tuo cane questa settimana',
    targetValue: 10,
    xpReward: 100,
  },
  {
    type: CHALLENGE_TYPE.NEW_MATCHES,
    title: 'Fai 3 nuovi match',
    description: 'Trova 3 nuovi compagni di passeggiata questa settimana',
    targetValue: 3,
    xpReward: 100,
  },
  {
    type: CHALLENGE_TYPE.GROUP_EVENTS_JOINED,
    title: 'Partecipa a 2 eventi',
    description: 'Unisciti a 2 eventi di gruppo questa settimana',
    targetValue: 2,
    xpReward: 100,
  },
] as const;

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

    for (const template of WEEKLY_TEMPLATES) {
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
