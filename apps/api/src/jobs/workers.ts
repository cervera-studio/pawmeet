import {
  dataCleanupDeps,
  eventStatusDeps,
  gdprExportWorkerDeps,
  photoModerationDeps,
  storyCleanupWorkerDeps,
} from '../container.js';
import { createAnalyticsAggregationWorker } from './analytics-aggregation.js';
import { createAnalyticsWorker } from './analytics-ingest.js';
import { createDataCleanupWorker } from './data-cleanup.js';
import { createEventStatusWorker, scheduleEventStatusCheck } from './event-status.js';
import { createGdprExportWorker } from './gdpr-export.js';
import { createPhotoModerationWorker } from './photo-moderation.js';
import {
  scheduleAnalyticsAggregation,
  scheduleDataCleanup,
  scheduleStoryCleanup,
} from './queue.js';
import { createEmailWorker } from './send-email.js';
import { createNotificationWorker } from './send-notification.js';
import { createStoryCleanupWorker } from './story-cleanup.js';

/** Start all BullMQ workers. Call this once on server startup. */
export async function startWorkers() {
  const photoWorker = createPhotoModerationWorker(photoModerationDeps);
  const notifWorker = createNotificationWorker();
  const emailWorker = createEmailWorker();
  const eventStatusWorker = createEventStatusWorker(eventStatusDeps);
  const analyticsWorker = createAnalyticsWorker();
  const aggregationWorker = createAnalyticsAggregationWorker();
  const dataCleanupWorker = createDataCleanupWorker(dataCleanupDeps);
  const gdprExportWorker = createGdprExportWorker(gdprExportWorkerDeps);
  const storyCleanupWorker = createStoryCleanupWorker(storyCleanupWorkerDeps);

  // Schedule repeatable jobs
  await scheduleEventStatusCheck();
  await scheduleAnalyticsAggregation();
  await scheduleDataCleanup();
  await scheduleStoryCleanup();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('[workers] Shutting down...');
    await Promise.all([
      photoWorker.close(),
      notifWorker.close(),
      emailWorker.close(),
      eventStatusWorker.close(),
      analyticsWorker.close(),
      aggregationWorker.close(),
      dataCleanupWorker.close(),
      gdprExportWorker.close(),
      storyCleanupWorker.close(),
    ]);
    console.log('[workers] All workers stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
