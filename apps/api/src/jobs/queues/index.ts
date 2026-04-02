export type { AnalyticsJobData } from './analytics-queues.js';
export {
  enqueueAnalyticsEvents,
  getAnalyticsDlqQueue,
  getAnalyticsQueue,
  moveToAnalyticsDlq,
} from './analytics-queues.js';
export { createLazyQueue, getRedisConnection } from './connection.js';
export {
  getExperimentGuardrailsQueue,
  getExperimentMetricsQueue,
  scheduleExperimentGuardrails,
  scheduleExperimentMetrics,
} from './experiment-queues.js';
export {
  getRisingCompatibilityQueue,
  getStreakCheckQueue,
  getWeeklyChallengesQueue,
  scheduleRisingCompatibility,
  scheduleStreakCheck,
  scheduleWeeklyChallenges,
} from './gamification-queues.js';
export type { GdprExportJobData } from './gdpr-queues.js';
export { enqueueGdprExport, getGdprExportQueue } from './gdpr-queues.js';
export {
  enqueueDataCleanup,
  enqueueGpsRetention,
  enqueueStoryCleanup,
  getDataCleanupQueue,
  getEventStatusQueue,
  getGpsRetentionQueue,
  getStoryCleanupQueue,
  scheduleDataCleanup,
  scheduleGpsRetention,
  scheduleStoryCleanup,
} from './lifecycle-queues.js';
export type { EmbeddingGenerationJobData } from './ml-queues.js';
export {
  enqueueEmbeddingGeneration,
  getEmbeddingGenerationQueue,
  getMlFeatureComputeQueue,
  getMlOptimalTimesQueue,
  getMlRecommendationsQueue,
  getMlTrainingLabelsQueue,
  getMlTrainingQueue,
  scheduleMlFeatureCompute,
  scheduleMlOptimalTimes,
  scheduleMlRecommendations,
  scheduleMlTraining,
  scheduleMlTrainingLabels,
} from './ml-queues.js';
export type {
  CommentToxicityJobData,
  ContentModerationJobData,
  MessageToxicityJobData,
  PhotoModerationJobData,
} from './moderation-queues.js';
export {
  enqueueCommentToxicityCheck,
  enqueueContentModeration,
  enqueueMessageToxicityCheck,
  enqueuePhotoModeration,
  getContentModerationQueue,
  getMessageToxicityQueue,
  getPhotoModerationQueue,
} from './moderation-queues.js';
export type { EmailJobData, NotificationJobData } from './notification-queues.js';
export {
  enqueueEmail,
  enqueueNotification,
  getEmailQueue,
  getNotificationQueue,
} from './notification-queues.js';

export const QUEUE_NAMES = {
  PHOTO_MODERATION: 'photo-moderation',
  CONTENT_MODERATION: 'content-moderation',
  STORY_CLEANUP: 'story-cleanup',
  NOTIFICATIONS: 'notifications',
  EMAIL: 'email',
  EVENT_STATUS: 'event-status',
  DATA_CLEANUP: 'data-cleanup',
  GPS_RETENTION: 'gps-retention',
  ANALYTICS: 'analytics',
  ANALYTICS_DLQ: 'analytics-dlq',
  GDPR_EXPORT: 'gdpr-export',
  RECURRING_EVENT: 'recurring-event',
  MESSAGE_TOXICITY: 'message-toxicity',
  ML_TRAINING_LABELS: 'ml-training-labels',
  ML_FEATURE_COMPUTE: 'ml-feature-compute',
  ML_TRAINING: 'ml-training',
  ML_RECOMMENDATIONS: 'ml-recommendations',
  ML_OPTIMAL_TIMES: 'ml-optimal-times',
  EXPERIMENT_METRICS: 'experiment-metrics',
  EXPERIMENT_GUARDRAILS: 'experiment-guardrails',
  WEEKLY_CHALLENGES: 'weekly-challenges',
  STREAK_CHECK: 'streak-check',
  RISING_COMPATIBILITY: 'rising-compatibility',
  EMBEDDING_GENERATION: 'embedding-generation',
} as const;
