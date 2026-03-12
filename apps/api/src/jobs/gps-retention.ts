import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

interface GpsRetentionDeps {
  db: NeonHttpDatabase;
}

/** GPS data retention period in days */
const GPS_RETENTION_DAYS = 90;

/**
 * Purge GPS track points older than 90 days.
 * GDPR Art. 5(1)(e) — Storage limitation.
 *
 * Walk tracks are kept (metadata), but detailed GPS points
 * are purged to minimize location data retention.
 */
export function createGpsRetentionWorker(deps: GpsRetentionDeps) {
  const { db } = deps;

  const worker = new Worker(
    QUEUE_NAMES.GPS_RETENTION,
    async () => {
      logger.info('GpsRetention', `Running GPS data purge (>${GPS_RETENTION_DAYS} days)...`);

      const result = await db.execute(
        sql`DELETE FROM walk_track_points
            WHERE recorded_at < NOW() - INTERVAL '${sql.raw(String(GPS_RETENTION_DAYS))} days'`,
      );

      logger.info('GpsRetention', `Purged ${result.rowCount ?? 0} GPS track points`);

      // Also clear precise location from users who haven't updated in 90+ days
      const locationCleanup = await db.execute(
        sql`UPDATE users
            SET latitude = NULL, longitude = NULL, location_updated_at = NULL
            WHERE location_updated_at < NOW() - INTERVAL '${sql.raw(String(GPS_RETENTION_DAYS))} days'
            AND latitude IS NOT NULL`,
      );

      logger.info(
        'GpsRetention',
        `Cleared stale locations for ${locationCleanup.rowCount ?? 0} users`,
      );
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.info('GpsRetention', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('GpsRetention', `Job ${job?.id} failed`, err);
  });

  return worker;
}
