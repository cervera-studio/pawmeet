import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import type { NearbyJobRepository } from '../ports/nearby-job-repository.js';
import { enqueueNotification, getRedisConnection } from './queue.js';

const NEARBY_SUGGESTION = 'nearby-suggestion';
const COOLDOWN_HOURS = 24;
const COOLDOWN_KEY_PREFIX = 'nearby-notif:';

interface NearbySuggestionDeps {
  nearbyJobRepo: NearbyJobRepository;
}

/**
 * Proactive nearby suggestion notifications.
 * Runs every 15 minutes. For recently active users with nearby preference enabled,
 * checks for compatible nearby users and sends a push if not sent in the last 24h.
 */
export function createNearbySuggestionWorker(deps: NearbySuggestionDeps) {
  const { nearbyJobRepo } = deps;

  const worker = new Worker(
    NEARBY_SUGGESTION,
    async () => {
      const now = new Date();
      const activeThreshold = new Date(now.getTime() - 30 * 60 * 1000); // active in last 30 min

      // Find users who updated location recently and have nearby notifications enabled
      const activeUsers = await nearbyJobRepo.findActiveUsersWithLocation(activeThreshold, 100);

      if (activeUsers.length === 0) return;

      logger.info(
        'nearby-suggestion',
        `Checking ${activeUsers.length} active users for nearby matches`,
      );

      for (const user of activeUsers) {
        if (!(user.latitude && user.longitude)) continue;

        // Check cooldown — only send once per 24h per user
        const cooldownKey = `${COOLDOWN_KEY_PREFIX}${user.id}`;
        const alreadySent = await redis.get<string>(cooldownKey);
        if (alreadySent) continue;

        // Find nearby users with dogs (PostGIS distance)
        const count = await nearbyJobRepo.countNearbyUsersWithDogs(
          user.id,
          user.latitude,
          user.longitude,
          user.searchRadiusKm,
        );

        if (count === 0) continue;

        await enqueueNotification({
          userId: user.id,
          title: '📍 Cani nelle vicinanze!',
          body:
            count === 1
              ? "C'è 1 cane compatibile nella tua zona — scoprilo!"
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
