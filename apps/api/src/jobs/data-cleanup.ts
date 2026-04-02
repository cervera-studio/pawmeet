import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { DataCleanupRepository } from '../ports/data-cleanup-repository.js';
import type { StorageService } from '../ports/storage-service.js';
import { getRedisConnection, QUEUE_NAMES } from './queues/index.js';

interface DataCleanupDeps {
  dataCleanupRepo: DataCleanupRepository;
  storage?: StorageService;
}

/**
 * Hard-delete user accounts that have been deactivated for 30+ days.
 * GDPR Art. 17 — Right to erasure.
 *
 * Relies on ON DELETE CASCADE for all related tables (messages, dogs,
 * walks, tokens, etc.) to cascade the deletion automatically.
 */
export function createDataCleanupWorker(deps: DataCleanupDeps) {
  const { dataCleanupRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.DATA_CLEANUP,
    async () => {
      logger.info('DataCleanup', 'Running account purge for deactivated accounts...');

      const now = new Date();

      // Find and hard-delete users whose deletion grace period has expired
      // ON DELETE CASCADE handles all FK relationships
      const deleted = await dataCleanupRepo.purgeDeactivatedAccounts(now);

      if (deleted.length > 0) {
        logger.info('DataCleanup', `Purged ${deleted.length} deactivated accounts`);
      } else {
        logger.info('DataCleanup', 'No accounts to purge');
      }

      // Clean up expired refresh tokens (revoked or expired)
      await dataCleanupRepo.cleanExpiredRefreshTokens();
      logger.info('DataCleanup', 'Cleaned expired refresh tokens');

      // Clean up expired verification tokens (used or expired > 7 days ago)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await dataCleanupRepo.cleanExpiredVerificationTokens(sevenDaysAgo);
      logger.info('DataCleanup', 'Cleaned expired verification tokens');

      // Hard-delete soft-deleted messages from inactive matches (6+ months old)
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      const staleMatchIds = await dataCleanupRepo.findStaleInactiveMatchIds(sixMonthsAgo);

      if (staleMatchIds.length > 0) {
        await dataCleanupRepo.hardDeleteSoftDeletedMessages(staleMatchIds);

        logger.info('DataCleanup', 'Hard-deleted soft-deleted messages from stale matches', {
          matchCount: staleMatchIds.length,
        });
      } else {
        logger.info('DataCleanup', 'No stale matches with soft-deleted messages to purge');
      }

      // Clean up expired GDPR export files from R2 and DB
      const expiredExports = await dataCleanupRepo.findExpiredGdprExports();

      if (expiredExports.length > 0 && deps.storage) {
        for (const exp of expiredExports) {
          if (exp.r2Key) {
            try {
              await deps.storage.deleteObject(exp.r2Key);
            } catch (err) {
              logger.error('DataCleanup', `Failed to delete R2 object ${exp.r2Key}`, err);
            }
          }
        }

        await dataCleanupRepo.deleteGdprExports(expiredExports.map((e) => e.id));

        logger.info('DataCleanup', `Cleaned ${expiredExports.length} expired GDPR exports`);
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.info('DataCleanup', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('DataCleanup', `Job ${job?.id} failed`, err);
  });

  return worker;
}
