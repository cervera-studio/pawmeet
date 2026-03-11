import { gdprExports, users } from '@dogwalk/db';
import { logger } from '@dogwalk/utils';
import { Worker } from 'bullmq';
import { and, eq, isNotNull, lt, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { StorageService } from '../ports/storage-service.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

interface DataCleanupDeps {
  db: NeonHttpDatabase;
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
  const { db } = deps;

  const worker = new Worker(
    QUEUE_NAMES.DATA_CLEANUP,
    async () => {
      logger.info('DataCleanup', 'Running account purge for deactivated accounts...');

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Find and hard-delete users deactivated > 30 days ago
      // ON DELETE CASCADE handles all FK relationships
      const deleted = await db
        .delete(users)
        .where(and(eq(users.isActive, false), lt(users.lastLoginAt, thirtyDaysAgo)))
        .returning({ id: users.id, email: users.email });

      if (deleted.length > 0) {
        logger.info('DataCleanup', `Purged ${deleted.length} deactivated accounts`);
      } else {
        logger.info('DataCleanup', 'No accounts to purge');
      }

      // Clean up expired refresh tokens (revoked or expired)
      const tokenCleanup = await db.execute(
        sql`DELETE FROM refresh_tokens WHERE revoked = true OR expires_at < NOW()`,
      );
      logger.info('DataCleanup', 'Cleaned expired refresh tokens', {
        count: tokenCleanup.rowCount,
      });

      // Clean up expired verification tokens (used or expired)
      const verificationCleanup = await db.execute(
        sql`DELETE FROM verification_tokens WHERE used = true OR expires_at < NOW()`,
      );
      logger.info('DataCleanup', 'Cleaned expired verification tokens', {
        count: verificationCleanup.rowCount,
      });

      // Clean up expired GDPR export files from R2 and DB
      const expiredExports = await db
        .select({ id: gdprExports.id, r2Key: gdprExports.r2Key })
        .from(gdprExports)
        .where(
          and(
            eq(gdprExports.status, 'completed'),
            isNotNull(gdprExports.expiresAt),
            lt(gdprExports.expiresAt, new Date()),
          ),
        );

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

        await db.delete(gdprExports).where(
          sql`id IN (${sql.join(
            expiredExports.map((e) => sql`${e.id}`),
            sql`, `,
          )})`,
        );

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
