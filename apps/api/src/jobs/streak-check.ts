import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { trackEvent } from '../lib/track-event.js';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queues/index.js';

interface StreakCheckDeps {
  gamificationRepo: GamificationRepository;
}

/** Worker that breaks stale streaks (lastActivityDate < yesterday). */
export function createStreakCheckWorker(deps: StreakCheckDeps): Worker {
  const { gamificationRepo } = deps;

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

      logger.info('StreakCheck', `Broke ${staleStreaks.length} stale streaks`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );
}
