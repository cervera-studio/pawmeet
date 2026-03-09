import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

export const photoModerationQueue = new Queue('photo-moderation', { connection });
export const notificationQueue = new Queue('notifications', { connection });
