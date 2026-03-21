import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { GpsRetentionRepository } from '../ports/gps-retention-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

interface GpsRetentionDeps {
  gpsRetentionRepo: GpsRetentionRepository;
}

/** GPS and location data retention period in days */
const GPS_RETENTION_DAYS = 90;

/** Notification log retention period in days */
const NOTIFICATION_RETENTION_DAYS = 90;

/** Admin audit log retention period in days (2 years) */
const AUDIT_LOG_RETENTION_DAYS = 730;

/**
 * Purge location-related data and time-limited logs.
 * GDPR Art. 5(1)(e) — Storage limitation.
 *
 * - GPS track points: 90 days
 * - Safety check-in GPS coordinates: 90 days
 * - Stale user locations: 90 days inactivity
 * - Notification log: 90 days
 * - Admin audit log: 2 years
 */
export function createGpsRetentionWorker(deps: GpsRetentionDeps) {
  const { gpsRetentionRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.GPS_RETENTION,
    async () => {
      logger.info('GpsRetention', 'Running data retention purge...');

      await gpsRetentionRepo.purgeOldTrackPoints(GPS_RETENTION_DAYS);
      logger.info('GpsRetention', 'Purged old GPS track points');

      await gpsRetentionRepo.purgeOldSafetyCheckins(GPS_RETENTION_DAYS);
      logger.info('GpsRetention', 'Purged old safety check-in GPS data');

      await gpsRetentionRepo.clearStaleUserLocations(GPS_RETENTION_DAYS);
      logger.info('GpsRetention', 'Cleared stale user locations');

      await gpsRetentionRepo.purgeOldNotifications(NOTIFICATION_RETENTION_DAYS);
      logger.info('GpsRetention', 'Purged old notification logs');

      await gpsRetentionRepo.purgeOldAuditLogs(AUDIT_LOG_RETENTION_DAYS);
      logger.info('GpsRetention', 'Purged old admin audit logs');
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
