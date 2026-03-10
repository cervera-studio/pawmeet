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
  NOTIFICATIONS: 'notifications',
  EMAIL: 'email',
} as const;

// --- Lazy queue instances ---

let _photoModerationQueue: Queue | null = null;
let _notificationQueue: Queue | null = null;
let _emailQueue: Queue | null = null;

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

// --- Job type definitions ---

export interface PhotoModerationJobData {
  photoId: string;
  dogId: string;
  url: string;
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
