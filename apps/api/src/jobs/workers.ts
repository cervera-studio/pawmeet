import {
  analyticsProviders,
  analyticsWorkerDeps,
  dataCleanupDeps,
  eventStatusDeps,
  gdprExportWorkerDeps,
  gpsRetentionDeps,
  messageToxicityDeps,
  photoModerationDeps,
  recurringEventDeps,
  storyCleanupWorkerDeps,
} from '../container.js';
import { createAnalyticsAggregationWorker } from './analytics-aggregation.js';
import { createAnalyticsWorker } from './analytics-ingest.js';
import { createDataCleanupWorker } from './data-cleanup.js';
import { createEventStatusWorker, scheduleEventStatusCheck } from './event-status.js';
import { createGdprExportWorker } from './gdpr-export.js';
import { createGpsRetentionWorker } from './gps-retention.js';
import { createMessageToxicityWorker } from './message-toxicity.js';
import { createNearbySuggestionWorker, scheduleNearbySuggestions } from './nearby-suggestion.js';
import { createPhotoModerationWorker } from './photo-moderation.js';
import {
  scheduleAnalyticsAggregation,
  scheduleDataCleanup,
  scheduleGpsRetention,
  scheduleStoryCleanup,
} from './queue.js';
import {
  createRecurringEventWorker,
  scheduleRecurringEventGeneration,
} from './recurring-event-generate.js';
import { createEmailWorker } from './send-email.js';
import { createNotificationWorker } from './send-notification.js';
import { createStoryCleanupWorker } from './story-cleanup.js';
import { createWalkReminderWorker, scheduleWalkReminders } from './walk-reminder.js';
import { createWalkSafetyAlertWorker, scheduleWalkSafetyAlerts } from './walk-safety-alert.js';

/** Start all BullMQ workers. Call this once on server startup. */
export async function startWorkers() {
  const photoWorker = createPhotoModerationWorker(photoModerationDeps);
  const notifWorker = createNotificationWorker();
  const emailWorker = createEmailWorker();
  const eventStatusWorker = createEventStatusWorker(eventStatusDeps);
  const analyticsWorker = createAnalyticsWorker(analyticsWorkerDeps);
  const aggregationWorker = createAnalyticsAggregationWorker();
  const dataCleanupWorker = createDataCleanupWorker(dataCleanupDeps);
  const gdprExportWorker = createGdprExportWorker(gdprExportWorkerDeps);
  const storyCleanupWorker = createStoryCleanupWorker(storyCleanupWorkerDeps);
  const recurringEventWorker = createRecurringEventWorker(recurringEventDeps);
  const gpsRetentionWorker = createGpsRetentionWorker(gpsRetentionDeps);
  const walkReminderWorker = createWalkReminderWorker();
  const walkSafetyAlertWorker = createWalkSafetyAlertWorker();
  const nearbySuggestionWorker = createNearbySuggestionWorker();
  const messageToxicityWorker = messageToxicityDeps
    ? createMessageToxicityWorker(messageToxicityDeps)
    : null;

  // Schedule repeatable jobs
  await scheduleEventStatusCheck();
  await scheduleAnalyticsAggregation();
  await scheduleDataCleanup();
  await scheduleStoryCleanup();
  await scheduleRecurringEventGeneration();
  await scheduleGpsRetention();
  await scheduleWalkReminders();
  await scheduleWalkSafetyAlerts();
  await scheduleNearbySuggestions();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('[workers] Shutting down...');
    // Close workers first, then flush analytics providers
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
      recurringEventWorker.close(),
      gpsRetentionWorker.close(),
      walkReminderWorker.close(),
      walkSafetyAlertWorker.close(),
      nearbySuggestionWorker.close(),
      ...(messageToxicityWorker ? [messageToxicityWorker.close()] : []),
    ]);
    // Flush analytics providers after workers stop to prevent event loss on deploys
    await Promise.allSettled(analyticsProviders.map((p) => p.shutdown()));
    console.log('[workers] All workers stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
