import { logger } from '@dogwalk/utils';
import { Worker } from 'bullmq';
import { DrizzleUserRepository } from '../infra/drizzle-user-repository.js';
import { db } from '../lib/db.js';
import { expo } from '../lib/push.js';
import type { NotificationJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

export function createNotificationWorker() {
  const userRepo = new DrizzleUserRepository(db);

  const worker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      const { userId, title, body, data } = job.data;
      logger.debug('notifications', `Sending to user ${userId}: ${title}`);

      const pushToken = await userRepo.findPushToken(userId);

      if (!pushToken) {
        logger.debug('notifications', `No push token for user ${userId}, skipping`);
        return;
      }

      const tickets = await expo.sendPushNotificationsAsync([
        {
          to: pushToken,
          title,
          body,
          data,
          sound: 'default',
        },
      ]);

      const ticket = tickets[0];
      if (ticket?.status === 'error') {
        logger.error('notifications', `Push send error: ${ticket.message}`, {
          userId,
          details: ticket.details,
        });
      }
    },
    { connection: getRedisConnection(), concurrency: 10 },
  );

  worker.on('completed', (job) => {
    logger.debug('notifications', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('notifications', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
