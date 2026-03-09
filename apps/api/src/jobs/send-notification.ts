import { Worker } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

const sendNotificationWorker = new Worker(
  'notifications',
  async (job) => {
    // TODO: implement push notification sending
    // - Get user's Expo push token from database
    // - Build notification payload
    // - Send via Expo push notification service
    console.log(`Processing notification job ${job.id}`, job.data);
  },
  { connection },
);

sendNotificationWorker.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed`);
});

sendNotificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);
});

export { sendNotificationWorker };
