import { createEmailWorker } from './send-email.js';
import { createNotificationWorker } from './send-notification.js';
import { createPhotoModerationWorker } from './photo-moderation.js';

/** Start all BullMQ workers. Call this once on server startup. */
export function startWorkers() {
  const photoWorker = createPhotoModerationWorker();
  const notifWorker = createNotificationWorker();
  const emailWorker = createEmailWorker();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('[workers] Shutting down...');
    await Promise.all([photoWorker.close(), notifWorker.close(), emailWorker.close()]);
    console.log('[workers] All workers stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
