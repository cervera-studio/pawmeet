import { isFailure } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { EmailService } from '../ports/email-service.js';
import type { GdprExportRepository } from '../ports/gdpr-export-repository.js';
import type { StorageService } from '../ports/storage-service.js';
import type { GdprExportJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

/** Presigned download URL expiry: 48 hours */
const DOWNLOAD_URL_EXPIRY_SECONDS = 48 * 60 * 60;

/** R2 file expiry: 7 days from now */
const FILE_RETENTION_DAYS = 7;

interface GdprExportWorkerDeps {
  exportUserData: (userId: string) => Promise<import('@pawmeet/types').Result<unknown>>;
  gdprExportRepo: GdprExportRepository;
  storage: StorageService;
  emailService: EmailService;
}

export function createGdprExportWorker(deps: GdprExportWorkerDeps) {
  const { exportUserData, gdprExportRepo, storage, emailService } = deps;

  const worker = new Worker<GdprExportJobData>(
    QUEUE_NAMES.GDPR_EXPORT,
    async (job) => {
      const { userId, email, displayName, exportId, locale } = job.data;
      logger.info('GdprExport', `Starting export for user ${userId}`, { exportId });

      // Mark as processing
      await gdprExportRepo.updateExportStatus(exportId, 'processing');

      // Run the export
      const result = await exportUserData(userId);

      if (isFailure(result)) {
        throw new Error(`Export failed: ${result.error.message}`);
      }

      // Serialize and upload to R2
      const jsonData = JSON.stringify(result.data, null, 2);
      const r2Key = `exports/${userId}/${Date.now()}.json`;

      await storage.uploadObject(r2Key, jsonData, 'application/json');

      // Generate presigned download URL
      const downloadUrl = await storage.generatePresignedDownloadUrl(
        r2Key,
        DOWNLOAD_URL_EXPIRY_SECONDS,
      );

      const expiresAt = new Date(Date.now() + FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      // Update DB record
      await gdprExportRepo.updateExportStatus(exportId, 'completed', {
        r2Key,
        expiresAt,
        completedAt: new Date(),
      });

      // Send email with download link
      await emailService.sendGdprExportReady(email, displayName, downloadUrl, locale);

      logSecurityEvent({
        event: SECURITY_EVENT.GdprExportCompleted,
        userId,
        metadata: { exportId, fileSizeBytes: jsonData.length },
      });

      logger.info('GdprExport', `Export completed for user ${userId}`, {
        exportId,
        fileSizeBytes: jsonData.length,
      });
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.info('GdprExport', `Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    logger.error('GdprExport', `Job ${job?.id} failed`, err);

    if (job?.data) {
      const { userId, email, displayName, exportId, locale } = job.data;

      // Mark as failed in DB
      await gdprExportRepo.updateExportStatus(exportId, 'failed', {
        errorMessage: err.message,
      });

      // Notify user
      await emailService.sendGdprExportFailed(email, displayName, job.data.locale);

      logSecurityEvent({
        event: SECURITY_EVENT.GdprExportFailed,
        userId,
        metadata: { exportId, error: err.message },
      });
    }
  });

  return worker;
}
