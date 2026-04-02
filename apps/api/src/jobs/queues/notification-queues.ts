import { createLazyQueue } from './connection.js';

// --- Queue getters ---

export const getNotificationQueue = createLazyQueue('notifications', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
});

export const getEmailQueue = createLazyQueue('email', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 500,
});

// --- Job data types ---

export interface NotificationJobData {
  userId: string;
  title: string;
  body: string;
  data?: import('@pawmeet/validation').PushNotificationData;
}

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

// --- Enqueue helpers ---

export async function enqueueNotification(data: NotificationJobData) {
  return getNotificationQueue().add('send', data);
}

export async function enqueueEmail(data: EmailJobData) {
  return getEmailQueue().add('send', data);
}
