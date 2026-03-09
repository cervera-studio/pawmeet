import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

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
