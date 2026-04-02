import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import type { MlOptimalTimesRepository } from '../ports/ml-optimal-times-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queues/index.js';

const USER_BATCH_SIZE = 200;
const OPTIMAL_TIMES_TTL_SECONDS = 25 * 60 * 60; // 25 hours
const TOP_WINDOWS = 5;
const ACTIVE_DAYS = 7;

interface OptimalTimeSlot {
  dayOfWeek: number;
  hourStart: number;
  hourEnd: number;
  score: number;
  nearbyCount: number;
}

interface MlOptimalTimesDeps {
  mlOptimalTimesRepo: MlOptimalTimesRepository;
}

/**
 * BullMQ worker that computes optimal walking times per active user.
 * Scheduled daily at 04:00 UTC. Cross-correlates user activity windows
 * with nearby users' patterns to find best overlap times.
 * Results stored in Redis as JSON (ml:optimal-times:{userId}).
 */
export function createMlOptimalTimesWorker(deps: MlOptimalTimesDeps) {
  const { mlOptimalTimesRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.ML_OPTIMAL_TIMES,
    async () => {
      logger.info('ml-optimal-times', 'Starting optimal times computation');

      const activeThreshold = new Date();
      activeThreshold.setDate(activeThreshold.getDate() - ACTIVE_DAYS);

      let offset = 0;
      let totalProcessed = 0;

      while (true) {
        // Fetch batch of active users with location and activity data
        const activeUsers = await mlOptimalTimesRepo.getActiveUsersWithLocationBatch(
          activeThreshold,
          USER_BATCH_SIZE,
          offset,
        );

        if (activeUsers.length === 0) break;

        for (const user of activeUsers) {
          if (!(user.latitude && user.longitude)) continue;

          try {
            await computeOptimalTimesForUser(mlOptimalTimesRepo, user);
          } catch (err) {
            logger.error(
              'ml-optimal-times',
              `Failed for user ${user.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        totalProcessed += activeUsers.length;
        offset += USER_BATCH_SIZE;

        logger.debug('ml-optimal-times', `Processed ${totalProcessed} users so far`);

        if (activeUsers.length < USER_BATCH_SIZE) break;
      }

      logger.info('ml-optimal-times', `Computed optimal times for ${totalProcessed} users`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('ml-optimal-times', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('ml-optimal-times', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

async function computeOptimalTimesForUser(
  mlOptimalTimesRepo: MlOptimalTimesRepository,
  user: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    searchRadiusKm: number;
  },
) {
  // 1. Get this user's activity windows
  const ownWindows = await mlOptimalTimesRepo.getUserActivityWindows(user.id);

  if (ownWindows.length === 0) return;

  // 2. Find nearby users' aggregated activity windows via PostGIS
  if (user.latitude === null || user.longitude === null) return;

  const nearbyActivity = await mlOptimalTimesRepo.getNearbyActivityWindows(
    user.id,
    user.latitude,
    user.longitude,
    user.searchRadiusKm,
  );

  if (nearbyActivity.length === 0) return;

  // 3. Build user's own activity lookup for overlap scoring
  const ownActivityMap = new Map<string, number>();
  for (const w of ownWindows) {
    ownActivityMap.set(`${w.dayOfWeek}:${w.hourOfDay}`, w.activityCount);
  }

  // 4. Compute overlap heatmap: own_activity × nearby_activity
  const heatmap: Array<{
    dayOfWeek: number;
    hourOfDay: number;
    score: number;
    nearbyCount: number;
  }> = [];

  for (const slot of nearbyActivity) {
    const key = `${slot.dayOfWeek}:${slot.hourOfDay}`;
    const ownActivity = ownActivityMap.get(key) ?? 0;
    if (ownActivity === 0) continue; // user isn't active at this time

    const score = ownActivity * Number(slot.totalActivity);
    heatmap.push({
      dayOfWeek: slot.dayOfWeek,
      hourOfDay: slot.hourOfDay,
      score,
      nearbyCount: Number(slot.userCount),
    });
  }

  if (heatmap.length === 0) return;

  // 5. Normalize scores to [0, 1]
  const maxScore = Math.max(...heatmap.map((h) => h.score));
  if (maxScore > 0) {
    for (const h of heatmap) {
      h.score /= maxScore;
    }
  }

  // 6. Sort by score descending, pick top windows
  heatmap.sort((a, b) => b.score - a.score);
  const topSlots = heatmap.slice(0, TOP_WINDOWS);

  const optimalTimes: OptimalTimeSlot[] = topSlots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    hourStart: slot.hourOfDay,
    hourEnd: Math.min(slot.hourOfDay + 1, 23),
    score: Math.round(slot.score * 1000) / 1000,
    nearbyCount: slot.nearbyCount,
  }));

  // 7. Store in Redis
  const redisKey = `ml:optimal-times:${user.id}`;
  await redis.set(redisKey, JSON.stringify(optimalTimes), { ex: OPTIMAL_TIMES_TTL_SECONDS });
}
