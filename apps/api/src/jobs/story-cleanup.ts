import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { StorageService } from '../ports/storage-service.js';
import type { StoryRepository } from '../ports/story-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

interface StoryCleanupDeps {
  storyRepo: StoryRepository;
  storage: StorageService;
}

export function createStoryCleanupWorker(deps: StoryCleanupDeps) {
  const { storyRepo, storage } = deps;

  const worker = new Worker(
    QUEUE_NAMES.STORY_CLEANUP,
    async () => {
      logger.info('StoryCleanup', 'Running expired story cleanup...');

      const { deletedCount, mediaUrls } = await storyRepo.deleteExpiredStories();

      // Delete R2 objects for expired stories
      for (const url of mediaUrls) {
        try {
          const key = storage.extractKeyFromUrl(url);
          await storage.deleteObject(key);
        } catch (err) {
          logger.error('StoryCleanup', `Failed to delete R2 object: ${url}`, err);
        }
      }

      logger.info('StoryCleanup', `Deleted ${deletedCount} expired stories`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.info('StoryCleanup', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('StoryCleanup', `Job ${job?.id} failed`, err.message);
  });

  return worker;
}
