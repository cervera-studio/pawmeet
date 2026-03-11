import { eventStatusDeps, photoModerationDeps } from '../container.js';
import { db } from '../lib/db.js';
import { createAnalyticsAggregationWorker } from './analytics-aggregation.js';
import { createAnalyticsWorker } from './analytics-ingest.js';
import { createDataCleanupWorker } from './data-cleanup.js';
import { createEventStatusWorker, scheduleEventStatusCheck } from './event-status.js';
import { createPhotoModerationWorker } from './photo-moderation.js';
import { scheduleAnalyticsAggregation, scheduleDataCleanup } from './queue.js';
import { createEmailWorker } from './send-email.js';
import { createNotificationWorker } from './send-notification.js';

/** Start all BullMQ workers. Call this once on server startup. */
export async function startWorkers() {
  const photoWorker = createPhotoModerationWorker(photoModerationDeps);
  const notifWorker = createNotificationWorker();
  const emailWorker = createEmailWorker();
  const eventStatusWorker = createEventStatusWorker(eventStatusDeps);
  const analyticsWorker = createAnalyticsWorker();
  const aggregationWorker = createAnalyticsAggregationWorker();
  const dataCleanupWorker = createDataCleanupWorker({ db });

  // Schedule repeatable jobs
  await scheduleEventStatusCheck();
  await scheduleAnalyticsAggregation();
  await scheduleDataCleanup();

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
    ]);
    console.log('[workers] All workers stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
