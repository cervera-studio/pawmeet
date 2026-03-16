import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { GpsRetentionRepository } from '../ports/gps-retention-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

interface GpsRetentionDeps {
  gpsRetentionRepo: GpsRetentionRepository;
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
  const { gpsRetentionRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.GPS_RETENTION,
    async () => {
      logger.info('GpsRetention', `Running GPS data purge (>${GPS_RETENTION_DAYS} days)...`);

      await gpsRetentionRepo.purgeOldTrackPoints(GPS_RETENTION_DAYS);
      logger.info('GpsRetention', 'Purged old GPS track points');

      // Also clear precise location from users who haven't updated in 90+ days
      await gpsRetentionRepo.clearStaleUserLocations(GPS_RETENTION_DAYS);
      logger.info('GpsRetention', 'Cleared stale user locations');
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
