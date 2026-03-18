import process from 'node:process';
import { logger } from '@pawmeet/utils';
import {
  analyticsAggregationDeps,
  analyticsProviders,
  analyticsWorkerDeps,
  contentModerationWorkerDeps,
  dataCleanupDeps,
  embeddingGenerationDeps,
  eventStatusDeps,
  experimentGuardrailsDeps,
  experimentMetricsDeps,
  gdprExportWorkerDeps,
  gpsRetentionDeps,
  messageToxicityDeps,
  mlFeatureComputeDeps,
  mlOptimalTimesDeps,
  mlRecommendationsDeps,
  mlTrainingLabelsDeps,
  nearbySuggestionDeps,
  photoModerationDeps,
  recurringEventDeps,
  risingCompatibilityDeps,
  sendNotificationDeps,
  storyCleanupWorkerDeps,
  streakCheckDeps,
  walkReminderDeps,
  walkSafetyAlertDeps,
  weeklyChallengeRotationDeps,
} from '../container/index.js';
import { createAnalyticsAggregationWorker } from './analytics-aggregation.js';
import { createAnalyticsWorker } from './analytics-ingest.js';
import { createContentModerationWorker } from './content-moderation.js';
import { createDataCleanupWorker } from './data-cleanup.js';
import { createEmbeddingGenerationWorker } from './embedding-generation.js';
import { createEventStatusWorker, scheduleEventStatusCheck } from './event-status.js';
import { createExperimentGuardrailsWorker } from './experiment-guardrails.js';
import { createExperimentMetricsWorker } from './experiment-metrics.js';
import { createGdprExportWorker } from './gdpr-export.js';
import { createGpsRetentionWorker } from './gps-retention.js';
import { createMessageToxicityWorker } from './message-toxicity.js';
import { createMlFeatureComputeWorker } from './ml-feature-compute.js';
import { createMlOptimalTimesWorker } from './ml-optimal-times.js';
import { createMlRecommendationsWorker } from './ml-recommendations.js';
import { createMlTrainingLabelsWorker } from './ml-training-labels.js';
import { createNearbySuggestionWorker, scheduleNearbySuggestions } from './nearby-suggestion.js';
import { createPhotoModerationWorker } from './photo-moderation.js';
import {
  scheduleAnalyticsAggregation,
  scheduleDataCleanup,
  scheduleExperimentGuardrails,
  scheduleExperimentMetrics,
  scheduleGpsRetention,
  scheduleMlFeatureCompute,
  scheduleMlOptimalTimes,
  scheduleMlRecommendations,
  scheduleMlTrainingLabels,
  scheduleRisingCompatibility,
  scheduleStoryCleanup,
  scheduleStreakCheck,
  scheduleWeeklyChallenges,
} from './queue.js';
import {
  createRecurringEventWorker,
  scheduleRecurringEventGeneration,
} from './recurring-event-generate.js';
import { createRisingCompatibilityWorker } from './rising-compatibility.js';
import { createEmailWorker } from './send-email.js';
import { createNotificationWorker } from './send-notification.js';
import { createStoryCleanupWorker } from './story-cleanup.js';
import { createStreakCheckWorker } from './streak-check.js';
import { createWalkReminderWorker, scheduleWalkReminders } from './walk-reminder.js';
import { createWalkSafetyAlertWorker, scheduleWalkSafetyAlerts } from './walk-safety-alert.js';
import { createWeeklyChallengeRotationWorker } from './weekly-challenge-rotation.js';

/** Start all BullMQ workers. Call this once on server startup. */
export async function startWorkers() {
  const photoWorker = createPhotoModerationWorker(photoModerationDeps);
  const notifWorker = createNotificationWorker(sendNotificationDeps);
  const emailWorker = createEmailWorker();
  const eventStatusWorker = createEventStatusWorker(eventStatusDeps);
  const analyticsWorker = createAnalyticsWorker(analyticsWorkerDeps);
  const aggregationWorker = createAnalyticsAggregationWorker(analyticsAggregationDeps);
  const dataCleanupWorker = createDataCleanupWorker(dataCleanupDeps);
  const gdprExportWorker = createGdprExportWorker(gdprExportWorkerDeps);
  const storyCleanupWorker = createStoryCleanupWorker(storyCleanupWorkerDeps);
  const recurringEventWorker = createRecurringEventWorker(recurringEventDeps);
  const gpsRetentionWorker = createGpsRetentionWorker(gpsRetentionDeps);
  const walkReminderWorker = createWalkReminderWorker(walkReminderDeps);
  const walkSafetyAlertWorker = createWalkSafetyAlertWorker(walkSafetyAlertDeps);
  const nearbySuggestionWorker = createNearbySuggestionWorker(nearbySuggestionDeps);
  const mlTrainingLabelsWorker = createMlTrainingLabelsWorker(mlTrainingLabelsDeps);
  const mlFeatureComputeWorker = createMlFeatureComputeWorker(mlFeatureComputeDeps);
  const mlRecommendationsWorker = createMlRecommendationsWorker(mlRecommendationsDeps);
  const mlOptimalTimesWorker = createMlOptimalTimesWorker(mlOptimalTimesDeps);
  const risingCompatibilityWorker = createRisingCompatibilityWorker(risingCompatibilityDeps);
  const experimentMetricsWorker = createExperimentMetricsWorker(experimentMetricsDeps);
  const experimentGuardrailsWorker = createExperimentGuardrailsWorker(experimentGuardrailsDeps);
  const weeklyChallengeWorker = createWeeklyChallengeRotationWorker(weeklyChallengeRotationDeps);
  const streakCheckWorker = createStreakCheckWorker(streakCheckDeps);
  const contentModerationWorker = createContentModerationWorker(contentModerationWorkerDeps);
  const embeddingGenerationWorker = createEmbeddingGenerationWorker(embeddingGenerationDeps);
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
  await scheduleMlTrainingLabels();
  await scheduleMlFeatureCompute();
  await scheduleMlRecommendations();
  await scheduleMlOptimalTimes();
  await scheduleRisingCompatibility();
  await scheduleExperimentMetrics();
  await scheduleExperimentGuardrails();
  await scheduleWeeklyChallenges();
  await scheduleStreakCheck();

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Workers', 'Shutting down...');
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
      mlTrainingLabelsWorker.close(),
      mlFeatureComputeWorker.close(),
      mlRecommendationsWorker.close(),
      mlOptimalTimesWorker.close(),
      risingCompatibilityWorker.close(),
      experimentMetricsWorker.close(),
      experimentGuardrailsWorker.close(),
      weeklyChallengeWorker.close(),
      streakCheckWorker.close(),
      contentModerationWorker.close(),
      embeddingGenerationWorker.close(),
      ...(messageToxicityWorker ? [messageToxicityWorker.close()] : []),
    ]);
    // Flush analytics providers after workers stop to prevent event loss on deploys
    await Promise.allSettled(analyticsProviders.map((p) => p.shutdown()));
    logger.info('Workers', 'All workers stopped');
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
