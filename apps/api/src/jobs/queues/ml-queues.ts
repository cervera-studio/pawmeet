import { createLazyQueue } from './connection.js';

// --- Queue getters ---

export const getMlTrainingLabelsQueue = createLazyQueue('ml-training-labels', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

export const getMlFeatureComputeQueue = createLazyQueue('ml-feature-compute', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

export const getMlTrainingQueue = createLazyQueue('ml-training', {
  attempts: 2,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: 10,
  removeOnFail: 50,
});

export const getMlRecommendationsQueue = createLazyQueue('ml-recommendations', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

export const getMlOptimalTimesQueue = createLazyQueue('ml-optimal-times', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

export const getEmbeddingGenerationQueue = createLazyQueue('embedding-generation', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
});

// --- Job data types ---

export interface EmbeddingGenerationJobData {
  dogId: string;
  trigger: 'create' | 'update';
}

// --- Enqueue helpers ---

export async function enqueueEmbeddingGeneration(data: EmbeddingGenerationJobData) {
  return getEmbeddingGenerationQueue().add('generate', data, {
    jobId: `embed-${data.dogId}`,
  });
}

// --- Schedule helpers ---

/** Schedule daily ML training label materialization at 01:00 UTC (before analytics aggregation). */
export async function scheduleMlTrainingLabels() {
  const queue = getMlTrainingLabelsQueue();
  await queue.upsertJobScheduler(
    'daily-ml-training-labels',
    { pattern: '0 1 * * *' },
    { name: 'materialize' },
  );
}

/** Schedule ML feature precomputation every 4 hours. */
export async function scheduleMlFeatureCompute() {
  const queue = getMlFeatureComputeQueue();
  await queue.upsertJobScheduler(
    'periodic-ml-feature-compute',
    { pattern: '0 */4 * * *' },
    { name: 'compute' },
  );
}

/** Schedule weekly ML model training on Sunday at 03:00 UTC. */
export async function scheduleMlTraining() {
  const queue = getMlTrainingQueue();
  await queue.upsertJobScheduler('weekly-ml-training', { pattern: '0 3 * * 0' }, { name: 'train' });
}

/** Schedule ML recommendations precomputation every 2 hours. */
export async function scheduleMlRecommendations() {
  const queue = getMlRecommendationsQueue();
  await queue.upsertJobScheduler(
    'periodic-ml-recommendations',
    { pattern: '0 */2 * * *' },
    { name: 'compute' },
  );
}

/** Schedule daily optimal time prediction at 04:00 UTC. */
export async function scheduleMlOptimalTimes() {
  const queue = getMlOptimalTimesQueue();
  await queue.upsertJobScheduler(
    'daily-ml-optimal-times',
    { pattern: '0 4 * * *' },
    { name: 'compute' },
  );
}
