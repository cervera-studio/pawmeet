import { dogPhotos } from '@dogwalk/db';
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db.js';
import type { PhotoModerationJobData } from './queue.js';
import { enqueueNotification, getRedisConnection, QUEUE_NAMES } from './queue.js';

/** Stub: will be replaced with actual moderation service integration */
async function moderatePhoto(_url: string): Promise<'approved' | 'rejected'> {
  // TODO: call AWS Rekognition, OpenAI moderation, etc.
  return 'approved';
}

export function createPhotoModerationWorker() {
  const worker = new Worker<PhotoModerationJobData>(
    QUEUE_NAMES.PHOTO_MODERATION,
    async (job) => {
      const { photoId, url } = job.data;
      console.log(`[photo-moderation] Processing photo ${photoId}: ${url}`);

      // TODO: integrate with moderation service (e.g., AWS Rekognition, OpenAI)
      // For now, auto-approve all photos. Replace with actual moderation result.
      const status = await moderatePhoto(url);

      await db.update(dogPhotos).set({ moderationStatus: status }).where(eq(dogPhotos.id, photoId));

      if (status === 'rejected') {
        // Notify the user
        const [photo] = await db.select().from(dogPhotos).where(eq(dogPhotos.id, photoId));
        if (photo) {
          await enqueueNotification({
            userId: job.data.dogId, // Will need to resolve to ownerId in production
            title: 'Foto rifiutata',
            body: 'Una delle foto del tuo cane non rispetta le linee guida.',
          });
        }
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => {
    console.log(`[photo-moderation] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[photo-moderation] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
