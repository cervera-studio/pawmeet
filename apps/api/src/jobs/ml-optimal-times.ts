import { userActivityWindows, users } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

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

/**
 * BullMQ worker that computes optimal walking times per active user.
 * Scheduled daily at 04:00 UTC. Cross-correlates user activity windows
 * with nearby users' patterns to find best overlap times.
 * Results stored in Redis as JSON (ml:optimal-times:{userId}).
 */
export function createMlOptimalTimesWorker() {
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
        const activeUsers = await db
          .select({
            id: users.id,
            latitude: users.latitude,
            longitude: users.longitude,
            searchRadiusKm: users.searchRadiusKm,
          })
          .from(users)
          .where(
            and(
              eq(users.isActive, true),
              isNotNull(users.latitude),
              isNotNull(users.longitude),
              gt(users.lastLoginAt, activeThreshold),
            ),
          )
          .limit(USER_BATCH_SIZE)
          .offset(offset);

        if (activeUsers.length === 0) break;

        for (const user of activeUsers) {
          if (!user.latitude || !user.longitude) continue;

          try {
            await computeOptimalTimesForUser(user);
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

async function computeOptimalTimesForUser(user: {
  id: string;
  latitude: number | null;
  longitude: number | null;
  searchRadiusKm: number;
}) {
  // 1. Get this user's activity windows
  const ownWindows = await db
    .select({
      dayOfWeek: userActivityWindows.dayOfWeek,
      hourOfDay: userActivityWindows.hourOfDay,
      activityCount: userActivityWindows.activityCount,
    })
    .from(userActivityWindows)
    .where(eq(userActivityWindows.userId, user.id));

  if (ownWindows.length === 0) return;

  // 2. Find nearby users' aggregated activity windows via PostGIS
  const nearbyActivity = await db
    .select({
      dayOfWeek: userActivityWindows.dayOfWeek,
      hourOfDay: userActivityWindows.hourOfDay,
      totalActivity: sql<number>`SUM(${userActivityWindows.activityCount})`,
      userCount: sql<number>`COUNT(DISTINCT ${userActivityWindows.userId})`,
    })
    .from(userActivityWindows)
    .innerJoin(users, eq(userActivityWindows.userId, users.id))
    .where(
      and(
        eq(users.isActive, true),
        sql`${userActivityWindows.userId} != ${user.id}`,
        isNotNull(users.latitude),
        isNotNull(users.longitude),
        sql`ST_DWithin(
          ST_Point(${users.longitude}, ${users.latitude})::geography,
          ST_Point(${user.longitude}, ${user.latitude})::geography,
          ${user.searchRadiusKm * 1000}
        )`,
      ),
    )
    .groupBy(userActivityWindows.dayOfWeek, userActivityWindows.hourOfDay);

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
      h.score = h.score / maxScore;
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
