import { dogProfiles, users } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { enqueueNotification, getRedisConnection } from './queue.js';

const NEARBY_SUGGESTION = 'nearby-suggestion';
const COOLDOWN_HOURS = 24;
const COOLDOWN_KEY_PREFIX = 'nearby-notif:';

/**
 * Proactive nearby suggestion notifications.
 * Runs every 15 minutes. For recently active users with nearby preference enabled,
 * checks for compatible nearby users and sends a push if not sent in the last 24h.
 */
export function createNearbySuggestionWorker() {
  const worker = new Worker(
    NEARBY_SUGGESTION,
    async () => {
      const now = new Date();
      const activeThreshold = new Date(now.getTime() - 30 * 60 * 1000); // active in last 30 min

      // Find users who updated location recently and have nearby notifications enabled
      const activeUsers = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          latitude: users.latitude,
          longitude: users.longitude,
          searchRadiusKm: users.searchRadiusKm,
        })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            isNotNull(users.pushToken),
            isNotNull(users.latitude),
            isNotNull(users.longitude),
            gt(users.locationUpdatedAt, activeThreshold),
            // Check nearby pref via JSONB — defaults to true if missing
            sql`COALESCE((${users.notificationPrefs}->>'nearby')::boolean, true) = true`,
          ),
        )
        .limit(100); // Process in batches to avoid overload

      if (activeUsers.length === 0) return;

      logger.info('nearby-suggestion', `Checking ${activeUsers.length} active users for nearby matches`);

      for (const user of activeUsers) {
        if (!user.latitude || !user.longitude) continue;

        // Check cooldown — only send once per 24h per user
        const cooldownKey = `${COOLDOWN_KEY_PREFIX}${user.id}`;
        const alreadySent = await redis.get<string>(cooldownKey);
        if (alreadySent) continue;

        // Find nearby users with dogs (PostGIS distance)
        const nearbyCount = await db
          .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
          .from(users)
          .innerJoin(dogProfiles, and(eq(dogProfiles.ownerId, users.id), eq(dogProfiles.isActive, true)))
          .where(
            and(
              eq(users.isActive, true),
              sql`${users.id} != ${user.id}`,
              isNotNull(users.latitude),
              isNotNull(users.longitude),
              sql`ST_DWithin(
                ST_Point(${users.longitude}, ${users.latitude})::geography,
                ST_Point(${user.longitude}, ${user.latitude})::geography,
                ${user.searchRadiusKm * 1000}
              )`,
            ),
          );

        const count = nearbyCount[0]?.count ?? 0;
        if (count === 0) continue;

        await enqueueNotification({
          userId: user.id,
          title: '📍 Cani nelle vicinanze!',
          body: count === 1
            ? 'C\'è 1 cane compatibile nella tua zona — scoprilo!'
            : `Ci sono ${count} cani compatibili nella tua zona — scoprili!`,
          data: { type: 'nearby_suggestion' },
        });

        // Set cooldown (Upstash Redis)
        await redis.set(cooldownKey, '1', { ex: COOLDOWN_HOURS * 3600 });
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error('nearby-suggestion', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

/** Schedule nearby suggestion check every 15 minutes. */
export async function scheduleNearbySuggestions() {
  const { Queue } = await import('bullmq');
  const queue = new Queue(NEARBY_SUGGESTION, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  });
  await queue.upsertJobScheduler(
    'nearby-suggestion-check',
    { pattern: '*/15 * * * *' },
    { name: 'check' },
  );
}
