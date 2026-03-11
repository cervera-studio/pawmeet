import { Worker } from 'bullmq';
import { extractKeyFromUrl } from '../lib/storage.js';
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
      console.log('[story-cleanup] Running expired story cleanup...');

      const { deletedCount, mediaUrls } = await storyRepo.deleteExpiredStories();

      // Delete R2 objects for expired stories
      for (const url of mediaUrls) {
        try {
          const key = storage.extractKeyFromUrl(url);
          await storage.deleteObject(key);
        } catch (err) {
          console.error(`[story-cleanup] Failed to delete R2 object: ${url}`, err);
        }
      }

      console.log(`[story-cleanup] Deleted ${deletedCount} expired stories`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    console.log(`[story-cleanup] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[story-cleanup] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
