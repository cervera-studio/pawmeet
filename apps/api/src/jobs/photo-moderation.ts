import { Worker } from 'bullmq';

const connection = { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT), password: process.env.REDIS_PASSWORD, maxRetriesPerRequest: null };

const photoModerationWorker = new Worker(
  'photo-moderation',
  async (job) => {
    // TODO: implement photo moderation
    // - Download photo from R2
    // - Run moderation check (e.g., AWS Rekognition, OpenAI moderation)
    // - Update photo status in database
    // - Send notification if rejected
    console.log(`Processing photo moderation job ${job.id}`, job.data);
  },
  { connection },
);

photoModerationWorker.on('completed', (job) => {
  console.log(`Photo moderation job ${job.id} completed`);
});

photoModerationWorker.on('failed', (job, err) => {
  console.error(`Photo moderation job ${job?.id} failed:`, err);
});

export { photoModerationWorker };
