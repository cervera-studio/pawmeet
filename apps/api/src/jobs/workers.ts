import { eventStatusDeps, photoModerationDeps } from '../container.js';
import { createAnalyticsWorker } from './analytics-ingest.js';
import { createEventStatusWorker, scheduleEventStatusCheck } from './event-status.js';
import { createPhotoModerationWorker } from './photo-moderation.js';
import { createEmailWorker } from './send-email.js';
import { createNotificationWorker } from './send-notification.js';

/** Start all BullMQ workers. Call this once on server startup. */
export async function startWorkers() {
  const photoWorker = createPhotoModerationWorker(photoModerationDeps);
  const notifWorker = createNotificationWorker();
  const emailWorker = createEmailWorker();
  const eventStatusWorker = createEventStatusWorker(eventStatusDeps);
  const analyticsWorker = createAnalyticsWorker();

  // Schedule repeatable job for event status transitions (every 5 min)
  await scheduleEventStatusCheck();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('[workers] Shutting down...');
    await Promise.all([
      photoWorker.close(),
      notifWorker.close(),
      emailWorker.close(),
      eventStatusWorker.close(),
      analyticsWorker.close(),
    ]);
    console.log('[workers] All workers stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
