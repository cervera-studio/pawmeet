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
