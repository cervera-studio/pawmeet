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
