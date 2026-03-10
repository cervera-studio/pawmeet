import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { Worker } from 'bullmq';
import { extractKeyFromUrl, MAX_FILE_SIZE } from '../lib/storage.js';
import type { DogRepository } from '../ports/dog-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
import type { PhotoModerationJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

const R2_BUCKET = process.env.R2_BUCKET || 'dogwalk';

/**
 * Verify that the photo exists in R2 and meets basic requirements.
 * Returns the object's content length (in bytes) or null if the object does not exist.
 */
async function verifyPhotoInR2(url: string): Promise<{ exists: boolean; contentLength: number }> {
  const { r2 } = await import('../lib/r2.js');
  const key = extractKeyFromUrl(url);

  const response = await r2.send(
    new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );

  return {
    exists: true,
    contentLength: response.ContentLength ?? 0,
  };
}

/**
 * Placeholder moderation function.
 *
 * TODO: Replace with a real content moderation service such as:
 * - AWS Rekognition (DetectModerationLabels)
 * - Google Cloud Vision (SafeSearch)
 * - Azure Content Moderator
 * - OpenAI Moderation API
 *
 * Current behavior:
 * 1. Verifies the image exists in R2 (HEAD request)
 * 2. Checks file size is within limits
 * 3. Auto-approves if basic checks pass (no actual content analysis)
 */
async function moderatePhoto(url: string): Promise<'approved' | 'rejected'> {
  // Step 1: Verify the image exists in R2 and retrieve metadata
  let photoMeta: { exists: boolean; contentLength: number };
  try {
    photoMeta = await verifyPhotoInR2(url);
  } catch {
    console.error(`[photo-moderation] Photo not found in R2: ${url}`);
    return 'rejected';
  }

  // Step 2: Check file size is within limits
  if (photoMeta.contentLength > MAX_FILE_SIZE) {
    console.warn(
      `[photo-moderation] Photo exceeds size limit (${photoMeta.contentLength} bytes > ${MAX_FILE_SIZE} bytes): ${url}`,
    );
    return 'rejected';
  }

  if (photoMeta.contentLength === 0) {
    console.warn(`[photo-moderation] Photo has zero bytes: ${url}`);
    return 'rejected';
  }

  // Step 3: Auto-approve — no content moderation service is configured
  // TODO: Integrate a real moderation API here (see function docstring above)
  console.warn(
    '[photo-moderation] WARNING: No content moderation service configured. ' +
      'Photo auto-approved without content analysis. ' +
      'Configure AWS Rekognition, Google Vision, or similar before production.',
  );
  return 'approved';
}

interface PhotoModerationDeps {
  dogRepo: DogRepository;
  notificationService: NotificationService;
}

export function createPhotoModerationWorker(deps: PhotoModerationDeps) {
  const { dogRepo, notificationService } = deps;

  const worker = new Worker<PhotoModerationJobData>(
    QUEUE_NAMES.PHOTO_MODERATION,
    async (job) => {
      const { photoId, url } = job.data;
      console.log(`[photo-moderation] Processing photo ${photoId}: ${url}`);

      const status = await moderatePhoto(url);

      await dogRepo.updatePhotoModerationStatus(photoId, status);

      if (status === 'rejected') {
        // Notify the user
        const photo = await dogRepo.findPhotoById(photoId);
        if (photo) {
          await notificationService
            .send({
              userId: job.data.dogId, // Will need to resolve to ownerId in production
              title: 'Foto rifiutata',
              body: 'Una delle foto del tuo cane non rispetta le linee guida.',
            })
            .catch((err) => {
              console.error(`[photo-moderation] Failed to send notification:`, err);
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
