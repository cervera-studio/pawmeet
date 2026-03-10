import { Worker } from 'bullmq';
import { expo } from '../lib/push.js';
import type { NotificationJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

export function createNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      const { userId, title, body, data } = job.data;
      console.log(`[notifications] Sending to user ${userId}: ${title}`);

      // TODO: look up user's Expo push token from DB
      // For now, log and skip
      const pushToken = null; // await getUserPushToken(userId);

      if (!pushToken) {
        console.log(`[notifications] No push token for user ${userId}, skipping`);
        return;
      }

      await expo.sendPushNotificationsAsync([
        {
          to: pushToken,
          title,
          body,
          data,
          sound: 'default',
        },
      ]);
    },
    { connection: getRedisConnection(), concurrency: 10 },
  );

  worker.on('completed', (job) => {
    console.log(`[notifications] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[notifications] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
