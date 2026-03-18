import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { DogRepository } from '../ports/dog-repository.js';
import type { EmbeddingRepository } from '../ports/embedding-repository.js';
import type { EmbeddingService } from '../ports/embedding-service.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

export interface EmbeddingGenerationDeps {
  dogRepo: DogRepository;
  embeddingRepo: EmbeddingRepository;
  embeddingService: EmbeddingService;
}

/**
 * BullMQ worker that generates vector embeddings for dog profiles.
 * Triggered on dog create/update via enqueueEmbeddingGeneration().
 */
export function createEmbeddingGenerationWorker(deps: EmbeddingGenerationDeps) {
  const { dogRepo, embeddingRepo, embeddingService } = deps;

  const worker = new Worker(
    QUEUE_NAMES.EMBEDDING_GENERATION,
    async (job) => {
      const { dogId } = job.data as { dogId: string; trigger: string };

      const dog = await dogRepo.findById(dogId);
      if (!dog?.isActive) {
        logger.debug('embedding-generation', `Dog ${dogId} not found or inactive, skipping`);
        return;
      }

      const startMs = Date.now();
      const embedding = embeddingService.encode(dog);
      const latencyMs = Date.now() - startMs;

      await embeddingRepo.upsert(dogId, embedding, embeddingService.modelVersion);

      logger.info(
        'embedding-generation',
        `Generated embedding for dog ${dogId} (${latencyMs}ms, model: ${embeddingService.modelVersion})`,
      );
    },
    { connection: getRedisConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => {
    logger.debug('embedding-generation', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('embedding-generation', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
