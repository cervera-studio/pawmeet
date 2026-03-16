import { Worker } from 'bullmq';
import { gamificationRepo } from '../container/services.js';
import { trackEvent } from '../lib/track-event.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

/** Worker that breaks stale streaks (lastActivityDate < yesterday). */
export function createStreakCheckWorker(): Worker {
  return new Worker(
    QUEUE_NAMES.STREAK_CHECK,
    async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const staleStreaks = await gamificationRepo.findStreaksOlderThan(yesterday);

      for (const streak of staleStreaks) {
        await gamificationRepo.breakStreak(streak.id);
        trackEvent('gamification_streak_broken', streak.userId, {
          streakLength: streak.currentLength,
          streakType: streak.type,
        });
      }

      console.log(`[streak-check] Broke ${staleStreaks.length} stale streaks`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );
}
