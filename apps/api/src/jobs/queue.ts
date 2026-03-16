import { Queue } from 'bullmq';

/** BullMQ Redis connection config — uses standard Redis (not Upstash REST) */
export function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

// --- Queue names ---

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
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
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
} as const;

// --- Lazy queue instances ---

let _photoModerationQueue: Queue | null = null;
let _contentModerationQueue: Queue | null = null;
let _storyCleanupQueue: Queue | null = null;
let _notificationQueue: Queue | null = null;
let _emailQueue: Queue | null = null;
let _eventStatusQueue: Queue | null = null;

export function getPhotoModerationQueue(): Queue {
  if (!_photoModerationQueue) {
    _photoModerationQueue = new Queue(QUEUE_NAMES.PHOTO_MODERATION, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return _photoModerationQueue;
}

export function getContentModerationQueue(): Queue {
  if (!_contentModerationQueue) {
    _contentModerationQueue = new Queue(QUEUE_NAMES.CONTENT_MODERATION, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return _contentModerationQueue;
}

export function getStoryCleanupQueue(): Queue {
  if (!_storyCleanupQueue) {
    _storyCleanupQueue = new Queue(QUEUE_NAMES.STORY_CLEANUP, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return _storyCleanupQueue;
}

export function getNotificationQueue(): Queue {
  if (!_notificationQueue) {
    _notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return _notificationQueue;
}

export function getEmailQueue(): Queue {
  if (!_emailQueue) {
    _emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return _emailQueue;
}

export function getEventStatusQueue(): Queue {
  if (!_eventStatusQueue) {
    _eventStatusQueue = new Queue(QUEUE_NAMES.EVENT_STATUS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return _eventStatusQueue;
}

// ── Message toxicity detection ────────────────────────────────────────────────

let _messageToxicityQueue: Queue | null = null;

export function getMessageToxicityQueue(): Queue {
  if (!_messageToxicityQueue) {
    _messageToxicityQueue = new Queue(QUEUE_NAMES.MESSAGE_TOXICITY, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }
  return _messageToxicityQueue;
}

export interface MessageToxicityJobData {
  messageId: string;
  matchId: string;
  senderId: string;
  content: string;
}

export interface CommentToxicityJobData {
  commentId: string;
  postId: string;
  authorId: string;
  content: string;
}

export async function enqueueCommentToxicityCheck(data: CommentToxicityJobData) {
  return getMessageToxicityQueue().add('check-comment', data);
}

export async function enqueueMessageToxicityCheck(data: MessageToxicityJobData) {
  return getMessageToxicityQueue().add('check', data);
}

// --- Job type definitions ---

export interface PhotoModerationJobData {
  photoId: string;
  dogId: string;
  url: string;
}

export interface ContentModerationJobData {
  mediaId: string;
  postId: string;
  url: string;
  mediaType: 'photo' | 'video';
}

export interface NotificationJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

// --- Helper to enqueue jobs ---

export async function enqueuePhotoModeration(data: PhotoModerationJobData) {
  return getPhotoModerationQueue().add('moderate', data);
}

export async function enqueueNotification(data: NotificationJobData) {
  return getNotificationQueue().add('send', data);
}

export async function enqueueEmail(data: EmailJobData) {
  return getEmailQueue().add('send', data);
}

export async function enqueueContentModeration(data: ContentModerationJobData) {
  return getContentModerationQueue().add('moderate', data);
}

export async function enqueueStoryCleanup() {
  return getStoryCleanupQueue().add('cleanup', {}, { repeat: { every: 60 * 60 * 1000 } });
}

/** Schedule story cleanup every hour. */
export async function scheduleStoryCleanup() {
  const queue = getStoryCleanupQueue();
  await queue.upsertJobScheduler(
    'hourly-story-cleanup',
    { pattern: '0 * * * *' },
    { name: 'cleanup' },
  );
}

// ── Data cleanup (daily) ────────────────────────────────────────────────────

let _dataCleanupQueue: Queue | null = null;

export function getDataCleanupQueue(): Queue {
  if (!_dataCleanupQueue) {
    _dataCleanupQueue = new Queue(QUEUE_NAMES.DATA_CLEANUP, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return _dataCleanupQueue;
}

export async function enqueueDataCleanup() {
  return getDataCleanupQueue().add('cleanup', {}, { repeat: { every: 24 * 60 * 60 * 1000 } });
}

/** Schedule daily data cleanup at 03:00 UTC (after analytics aggregation at 02:00). */
export async function scheduleDataCleanup() {
  const queue = getDataCleanupQueue();
  await queue.upsertJobScheduler(
    'daily-data-cleanup',
    { pattern: '0 3 * * *' },
    { name: 'cleanup' },
  );
}

// ── GPS retention (daily) ───────────────────────────────────────────────────

let _gpsRetentionQueue: Queue | null = null;

export function getGpsRetentionQueue(): Queue {
  if (!_gpsRetentionQueue) {
    _gpsRetentionQueue = new Queue(QUEUE_NAMES.GPS_RETENTION, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return _gpsRetentionQueue;
}

export async function enqueueGpsRetention() {
  return getGpsRetentionQueue().add('retention', {}, { repeat: { every: 24 * 60 * 60 * 1000 } });
}

/** Schedule daily GPS data retention purge at 04:00 UTC (after data cleanup at 03:00). */
export async function scheduleGpsRetention() {
  const queue = getGpsRetentionQueue();
  await queue.upsertJobScheduler(
    'daily-gps-retention',
    { pattern: '0 4 * * *' },
    { name: 'retention' },
  );
}

// ── Analytics (async event ingestion) ────────────────────────────────────────

export interface AnalyticsJobData {
  events: Array<{
    clientEventId: string;
    userId: string | null;
    sessionId?: string;
    eventName: string;
    properties?: Record<string, unknown>;
    clientTimestamp: string;
    platform: string;
    appVersion?: string;
    screenName?: string;
  }>;
}

let _analyticsQueue: Queue | null = null;

export function getAnalyticsQueue(): Queue {
  if (!_analyticsQueue) {
    _analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }
  return _analyticsQueue;
}

export async function enqueueAnalyticsEvents(data: AnalyticsJobData) {
  return getAnalyticsQueue().add('ingest', data);
}

// --- Analytics Aggregation Queue ---

let _analyticsAggregationQueue: Queue | null = null;

export function getAnalyticsAggregationQueue(): Queue {
  if (!_analyticsAggregationQueue) {
    _analyticsAggregationQueue = new Queue(QUEUE_NAMES.ANALYTICS_AGGREGATION, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    });
  }
  return _analyticsAggregationQueue;
}

/** Schedule daily analytics aggregation at 02:00 UTC. */
export async function scheduleAnalyticsAggregation() {
  const queue = getAnalyticsAggregationQueue();
  await queue.upsertJobScheduler(
    'daily-aggregation',
    { pattern: '0 2 * * *' },
    { name: 'aggregate' },
  );
}

// ── Analytics Dead-Letter Queue ──────────────────────────────────────────────
// Failed analytics jobs (after all retries) are moved here for manual inspection.

let _analyticsDlqQueue: Queue | null = null;

export function getAnalyticsDlqQueue(): Queue {
  if (!_analyticsDlqQueue) {
    _analyticsDlqQueue = new Queue(QUEUE_NAMES.ANALYTICS_DLQ, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: false, // keep failed DLQ jobs for inspection
      },
    });
  }
  return _analyticsDlqQueue;
}

// ── GDPR Export ─────────────────────────────────────────────────────────────

export interface GdprExportJobData {
  userId: string;
  email: string;
  displayName: string;
  exportId: string;
}

let _gdprExportQueue: Queue | null = null;

export function getGdprExportQueue(): Queue {
  if (!_gdprExportQueue) {
    _gdprExportQueue = new Queue(QUEUE_NAMES.GDPR_EXPORT, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 60_000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });
  }
  return _gdprExportQueue;
}

export async function enqueueGdprExport(data: GdprExportJobData) {
  return getGdprExportQueue().add('export', data, {
    jobId: `gdpr-export-${data.userId}`,
  });
}

/** Move a failed analytics job to the dead-letter queue. */
export async function moveToAnalyticsDlq(
  jobName: string,
  data: unknown,
  error: string,
): Promise<void> {
  await getAnalyticsDlqQueue().add('dead-letter', {
    originalJob: jobName,
    data,
    error,
    failedAt: new Date().toISOString(),
  });
}

// ── ML Training Labels ───────────────────────────────────────────────────────

let _mlTrainingLabelsQueue: Queue | null = null;

export function getMlTrainingLabelsQueue(): Queue {
  if (!_mlTrainingLabelsQueue) {
    _mlTrainingLabelsQueue = new Queue(QUEUE_NAMES.ML_TRAINING_LABELS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    });
  }
  return _mlTrainingLabelsQueue;
}

/** Schedule daily ML training label materialization at 01:00 UTC (before analytics aggregation). */
export async function scheduleMlTrainingLabels() {
  const queue = getMlTrainingLabelsQueue();
  await queue.upsertJobScheduler(
    'daily-ml-training-labels',
    { pattern: '0 1 * * *' },
    { name: 'materialize' },
  );
}

// ── ML Feature Compute ───────────────────────────────────────────────────────

let _mlFeatureComputeQueue: Queue | null = null;

export function getMlFeatureComputeQueue(): Queue {
  if (!_mlFeatureComputeQueue) {
    _mlFeatureComputeQueue = new Queue(QUEUE_NAMES.ML_FEATURE_COMPUTE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    });
  }
  return _mlFeatureComputeQueue;
}

/** Schedule ML feature precomputation every 4 hours. */
export async function scheduleMlFeatureCompute() {
  const queue = getMlFeatureComputeQueue();
  await queue.upsertJobScheduler(
    'periodic-ml-feature-compute',
    { pattern: '0 */4 * * *' },
    { name: 'compute' },
  );
}

// ── ML Training ──────────────────────────────────────────────────────────────

let _mlTrainingQueue: Queue | null = null;

export function getMlTrainingQueue(): Queue {
  if (!_mlTrainingQueue) {
    _mlTrainingQueue = new Queue(QUEUE_NAMES.ML_TRAINING, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    });
  }
  return _mlTrainingQueue;
}

/** Schedule weekly ML model training on Sunday at 03:00 UTC. */
export async function scheduleMlTraining() {
  const queue = getMlTrainingQueue();
  await queue.upsertJobScheduler('weekly-ml-training', { pattern: '0 3 * * 0' }, { name: 'train' });
}

// ── ML Recommendations ───────────────────────────────────────────────────────

let _mlRecommendationsQueue: Queue | null = null;

export function getMlRecommendationsQueue(): Queue {
  if (!_mlRecommendationsQueue) {
    _mlRecommendationsQueue = new Queue(QUEUE_NAMES.ML_RECOMMENDATIONS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    });
  }
  return _mlRecommendationsQueue;
}

/** Schedule ML recommendations precomputation every 2 hours. */
export async function scheduleMlRecommendations() {
  const queue = getMlRecommendationsQueue();
  await queue.upsertJobScheduler(
    'periodic-ml-recommendations',
    { pattern: '0 */2 * * *' },
    { name: 'compute' },
  );
}

// ── ML Optimal Times ─────────────────────────────────────────────────────────

let _mlOptimalTimesQueue: Queue | null = null;

export function getMlOptimalTimesQueue(): Queue {
  if (!_mlOptimalTimesQueue) {
    _mlOptimalTimesQueue = new Queue(QUEUE_NAMES.ML_OPTIMAL_TIMES, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    });
  }
  return _mlOptimalTimesQueue;
}

/** Schedule daily optimal time prediction at 04:00 UTC. */
export async function scheduleMlOptimalTimes() {
  const queue = getMlOptimalTimesQueue();
  await queue.upsertJobScheduler(
    'daily-ml-optimal-times',
    { pattern: '0 4 * * *' },
    { name: 'compute' },
  );
}

// ── Experiment Metrics ───────────────────────────────────────────────────────

let _experimentMetricsQueue: Queue | null = null;

export function getExperimentMetricsQueue(): Queue {
  if (!_experimentMetricsQueue) {
    _experimentMetricsQueue = new Queue(QUEUE_NAMES.EXPERIMENT_METRICS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    });
  }
  return _experimentMetricsQueue;
}

/** Schedule daily experiment metrics snapshot at 03:30 UTC. */
export async function scheduleExperimentMetrics() {
  const queue = getExperimentMetricsQueue();
  await queue.upsertJobScheduler(
    'daily-experiment-metrics',
    { pattern: '30 3 * * *' },
    { name: 'snapshot' },
  );
}

// ── Experiment Guardrails ────────────────────────────────────────────────────

let _experimentGuardrailsQueue: Queue | null = null;

export function getExperimentGuardrailsQueue(): Queue {
  if (!_experimentGuardrailsQueue) {
    _experimentGuardrailsQueue = new Queue(QUEUE_NAMES.EXPERIMENT_GUARDRAILS, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 30,
        removeOnFail: 100,
      },
    });
  }
  return _experimentGuardrailsQueue;
}

/** Schedule daily experiment guardrail check at 04:30 UTC. */
export async function scheduleExperimentGuardrails() {
  const queue = getExperimentGuardrailsQueue();
  await queue.upsertJobScheduler(
    'daily-experiment-guardrails',
    { pattern: '30 4 * * *' },
    { name: 'check' },
  );
}
