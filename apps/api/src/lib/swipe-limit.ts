import { SWIPE_DAILY_LIMIT } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { AppError, fail } from '@pawmeet/types';
import type { MatchRepository } from '../ports/index.js';

/** Check the daily swipe limit for a dog. Returns a fail Result if the limit is reached, or null if OK. */
export async function checkDailySwipeLimit(
  matchRepo: MatchRepository,
  dogId: string,
): Promise<Result<never> | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyCount = await matchRepo.countDailySwipes(dogId, today);
  if (dailyCount >= SWIPE_DAILY_LIMIT) {
    return fail(new AppError('SWIPE_LIMIT_REACHED', 'Limite giornaliero di swipe raggiunto', 429));
  }
  return null;
}
