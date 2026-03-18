import process from 'node:process';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { extractKeyFromUrl, MAX_FILE_SIZE } from '../lib/storage.js';
import type { BreedDetectionService } from '../ports/breed-detection-service.js';
import type { ContentModerationService } from '../ports/content-moderation-service.js';
import type { DogRepository } from '../ports/dog-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
import type { PhotoModerationJobData } from './queue.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

const R2_BUCKET = process.env.R2_BUCKET || 'pawmeet';

/**
 * Verify that the photo exists in R2 and meets basic requirements.
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

interface PhotoModerationDeps {
  dogRepo: DogRepository;
  notificationService: NotificationService;
  contentModerationService?: ContentModerationService;
  breedDetectionService?: BreedDetectionService;
}

export function createPhotoModerationWorker(deps: PhotoModerationDeps) {
  const { dogRepo, notificationService, contentModerationService, breedDetectionService } = deps;

  const worker = new Worker<PhotoModerationJobData>(
    QUEUE_NAMES.PHOTO_MODERATION,
    async (job) => {
      const { photoId, dogId, url } = job.data;
      logger.info('PhotoModeration', `Processing photo ${photoId}: ${url}`);

      // Step 1: Verify image exists in R2
      let photoMeta: { exists: boolean; contentLength: number };
      try {
        photoMeta = await verifyPhotoInR2(url);
      } catch {
        logger.error('PhotoModeration', `Photo not found in R2: ${url}`);
        await dogRepo.updatePhotoModerationStatus(photoId, 'rejected');
        return;
      }

      // Step 2: Check file size
      if (photoMeta.contentLength > MAX_FILE_SIZE || photoMeta.contentLength === 0) {
        logger.warn(
          'PhotoModeration',
          `Photo invalid size (${photoMeta.contentLength} bytes): ${url}`,
        );
        await dogRepo.updatePhotoModerationStatus(photoId, 'rejected');
        return;
      }

      // Step 3: AI content moderation via Claude Vision (if configured)
      let status: 'approved' | 'rejected' = 'approved';
      if (contentModerationService) {
        try {
          const result = await contentModerationService.analyzeImage(url);
          status = result.safe ? 'approved' : 'rejected';
          if (!result.safe) {
            const flagged = result.categories
              .filter((c) => c.confidence > 0.7)
              .map((c) => c.name)
              .join(', ');
            logger.warn('PhotoModeration', `Photo rejected by AI: ${flagged}`);
          }
        } catch (err) {
          logger.error('PhotoModeration', 'AI moderation failed, falling back to approved', err);
        }
      } else {
        logger.warn('PhotoModeration', 'No content moderation service configured, auto-approving');
      }

      await dogRepo.updatePhotoModerationStatus(photoId, status);

      // Step 4: Breed detection (async, non-blocking, only on approved photos)
      if (status === 'approved' && breedDetectionService) {
        breedDetectionService
          .detectBreed(url)
          .then((result) => {
            if (result.breeds.length > 0) {
              logger.info(
                'PhotoModeration',
                `Detected breeds for dog ${dogId}: ${result.breeds.map((b) => `${b.name} (${Math.round(b.confidence * 100)}%)`).join(', ')}`,
              );
            }
          })
          .catch((err) => {
            logger.error('PhotoModeration', 'Breed detection failed', err);
          });
      }

      // Notify on rejection
      if (status === 'rejected') {
        const photo = await dogRepo.findPhotoById(photoId);
        if (photo) {
          await notificationService
            .send({
              userId: dogId,
              title: 'Foto rifiutata',
              body: 'Una delle foto del tuo cane non rispetta le linee guida.',
            })
            .catch((err) => {
              logger.error('PhotoModeration', 'Failed to send notification', err);
            });
        }
      }
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => {
    logger.info('PhotoModeration', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('PhotoModeration', `Job ${job?.id} failed`, err);
  });

  return worker;
}
