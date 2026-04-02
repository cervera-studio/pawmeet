import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { NOTIF_RISING_COMPATIBILITY } from '../constants/notifications.js';
import { redis } from '../lib/redis.js';
import { trackEvent } from '../lib/track-event.js';
import type { RisingCompatibilityRepository } from '../ports/rising-compatibility-repository.js';
import { enqueueNotification, getRedisConnection, QUEUE_NAMES } from './queue.js';

const SCORE_IMPROVEMENT_THRESHOLD = 0.15; // 15%
const ACTIVE_DAYS = 7;
const USER_BATCH_SIZE = 200;
const PREV_SCORES_TTL = 48 * 60 * 60; // 48h

interface RisingCompatibilityDeps {
  risingCompatibilityRepo: RisingCompatibilityRepository;
}

/**
 * BullMQ worker that detects "rising compatibility" between users.
 * When a user's compatibility score with a specific candidate increases by >15%
 * compared to the previous computation, sends a push notification encouraging
 * them to check the feed.
 *
 * Scheduled daily at 05:00 UTC (after ML recommendations precomputation).
 */
export function createRisingCompatibilityWorker(deps: RisingCompatibilityDeps) {
  const { risingCompatibilityRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.RISING_COMPATIBILITY,
    async () => {
      logger.info('rising-compatibility', 'Starting rising compatibility detection');

      const activeThreshold = new Date();
      activeThreshold.setDate(activeThreshold.getDate() - ACTIVE_DAYS);

      let offset = 0;
      let totalProcessed = 0;
      let totalNotified = 0;

      while (true) {
        // Fetch batch of active users with location
        const activeUsers = await risingCompatibilityRepo.getActiveUsersWithLocationBatch(
          activeThreshold,
          USER_BATCH_SIZE,
          offset,
        );

        if (activeUsers.length === 0) break;

        for (const user of activeUsers) {
          try {
            const notified = await detectRisingForUser(user.id);
            if (notified) totalNotified++;
          } catch (err) {
            logger.error(
              'rising-compatibility',
              `Failed for user ${user.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        totalProcessed += activeUsers.length;
        offset += USER_BATCH_SIZE;

        logger.debug('rising-compatibility', `Processed ${totalProcessed} users so far`);

        if (activeUsers.length < USER_BATCH_SIZE) break;
      }

      logger.info(
        'rising-compatibility',
        `Processed ${totalProcessed} users, notified ${totalNotified}`,
      );
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('rising-compatibility', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('rising-compatibility', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

async function detectRisingForUser(userId: string): Promise<boolean> {
  const recsKey = `ml:recs:${userId}`;
  const prevKey = `ml:rising:prev:${userId}`;

  // 1. Get current precomputed recs from sorted set (dogId -> score)
  const currentRecs = await redis.zrange(recsKey, 0, -1, { withScores: true });

  if (currentRecs.length === 0) return false;

  // Parse current recs into a map: dogId -> score
  const currentScores = new Map<string, number>();
  for (let i = 0; i < currentRecs.length; i += 2) {
    const dogId = currentRecs[i] as string;
    const score = currentRecs[i + 1] as number;
    currentScores.set(dogId, score);
  }

  // 2. Get previous scores from Redis hash
  const prevScores = await redis.hgetall<Record<string, string>>(prevKey);

  // 3. Compare: detect rising candidates
  let risingCount = 0;

  if (prevScores && Object.keys(prevScores).length > 0) {
    for (const [dogId, currentScore] of currentScores) {
      const prevScoreStr = prevScores[dogId];
      if (!prevScoreStr) continue;

      const prevScore = Number.parseFloat(prevScoreStr);
      if (prevScore <= 0) continue;

      const improvement = (currentScore - prevScore) / prevScore;
      if (improvement > SCORE_IMPROVEMENT_THRESHOLD) {
        risingCount++;
      }
    }
  }

  // 4. Save current scores as previous for next run
  const pipeline = redis.pipeline();
  pipeline.del(prevKey);
  if (currentScores.size > 0) {
    const hashEntries: Record<string, string> = {};
    for (const [dogId, score] of currentScores) {
      hashEntries[dogId] = score.toString();
    }
    pipeline.hset(prevKey, hashEntries);
    pipeline.expire(prevKey, PREV_SCORES_TTL);
  }
  await pipeline.exec();

  // 5. If any rising candidates, send push notification
  if (risingCount > 0) {
    await enqueueNotification({
      userId,
      title: NOTIF_RISING_COMPATIBILITY.title,
      body: NOTIF_RISING_COMPATIBILITY.body(risingCount),
      data: { type: 'nearby_suggestion' },
    });

    trackEvent('rising_compatibility_notified', userId, { risingCount });

    return true;
  }

  return false;
}
