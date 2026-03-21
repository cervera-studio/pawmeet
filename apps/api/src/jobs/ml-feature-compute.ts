import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import type { MlFeatureRepository } from '../ports/ml-feature-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

const FEATURE_TTL_SECONDS = 8 * 60 * 60; // 8 hours
const POINTER_TTL_SECONDS = 9 * 60 * 60; // 9 hours (outlives features)
const DB_BATCH_SIZE = 500;
const REDIS_BATCH_SIZE = 50;

interface DogFeatures {
  ageMonths: number;
  isNeutered: boolean;
  size: string;
  energyLevel: string;
  behaviorWithDogs: string;
  leashBehavior: string;
  walkPrefTime: string[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: string[];
}

interface UserFeatures {
  likeRate: number;
  matchSuccessRate: number;
  avgChatMessages: number;
  walkCompletionRate: number;
  sampleSize: number;
}

function computeAgeMonths(birthDate: Date): number {
  const now = new Date();
  return (
    (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth())
  );
}

/**
 * Write features to versioned keys in Redis batches.
 * Keys are written as `{baseKey}:{version}` so scoring reads from the current
 * version pointer while writes go to the new version. After all batches complete,
 * the pointer is atomically swapped to the new version.
 */
async function writeFeaturesInBatches(
  entries: Array<{ key: string; value: string }>,
  version: string,
): Promise<void> {
  for (let i = 0; i < entries.length; i += REDIS_BATCH_SIZE) {
    const batch = entries.slice(i, i + REDIS_BATCH_SIZE);
    const pipeline = redis.pipeline();
    for (const { key, value } of batch) {
      pipeline.set(`${key}:${version}`, value, { ex: FEATURE_TTL_SECONDS });
    }
    await pipeline.exec();
  }
}

/**
 * Atomically swap the version pointer so scoring reads switch to the new version
 * in a single operation. Old version keys expire naturally via TTL.
 */
async function swapVersionPointer(pointerKey: string, version: string): Promise<void> {
  await redis.set(pointerKey, version, { ex: POINTER_TTL_SECONDS });
}

interface MlFeatureComputeDeps {
  mlFeatureRepo: MlFeatureRepository;
}

/**
 * BullMQ worker that precomputes ML features for dogs and users,
 * storing them in Redis for fast access during scoring.
 * Scheduled every 4 hours via repeatable job.
 */
async function computeDogFeatures(
  mlFeatureRepo: MlFeatureRepository,
  version: string,
): Promise<number> {
  let dogOffset = 0;
  let totalDogs = 0;

  while (true) {
    const dogs = await mlFeatureRepo.getActiveDogsBatch(DB_BATCH_SIZE, dogOffset);
    if (dogs.length === 0) break;

    const entries = dogs.map((dog) => {
      const features: DogFeatures = {
        ageMonths: computeAgeMonths(dog.birthDate),
        isNeutered: dog.isNeutered,
        size: dog.size,
        energyLevel: dog.energyLevel,
        behaviorWithDogs: dog.behaviorWithDogs,
        leashBehavior: dog.leashBehavior,
        walkPrefTime: dog.walkPrefTime,
        walkPrefDurationMin: dog.walkPrefDurationMin,
        walkPrefDurationMax: dog.walkPrefDurationMax,
        walkPrefTerrain: dog.walkPrefTerrain,
      };
      return { key: `ml:features:dog:${dog.id}`, value: JSON.stringify(features) };
    });

    await writeFeaturesInBatches(entries, version);
    totalDogs += dogs.length;
    dogOffset += DB_BATCH_SIZE;
    if (dogs.length < DB_BATCH_SIZE) break;
  }

  return totalDogs;
}

async function computeUserFeaturesForBatch(
  mlFeatureRepo: MlFeatureRepository,
  users: { id: string }[],
): Promise<Array<{ key: string; value: string }>> {
  const results = await Promise.all(
    users.map(async (user) => {
      const [swipeStats, matchPrefs, avgMessages, walkStats] = await Promise.all([
        mlFeatureRepo.getUserSwipeStats(user.id),
        mlFeatureRepo.getUserMatchPrefs(user.id),
        mlFeatureRepo.getUserAvgMessages(user.id),
        mlFeatureRepo.getUserWalkStats(user.id),
      ]);

      const likeRate = swipeStats.total > 0 ? swipeStats.likes / swipeStats.total : 0;

      const features: UserFeatures = {
        likeRate,
        matchSuccessRate: matchPrefs?.successRate ?? 0,
        avgChatMessages: avgMessages,
        walkCompletionRate: walkStats.total > 0 ? walkStats.completed / walkStats.total : 0,
        sampleSize: matchPrefs?.sampleSize ?? 0,
      };

      return { key: `ml:features:user:${user.id}`, value: JSON.stringify(features) };
    }),
  );

  return results;
}

async function computeUserFeatures(
  mlFeatureRepo: MlFeatureRepository,
  version: string,
): Promise<number> {
  let userOffset = 0;
  let totalUsers = 0;

  while (true) {
    const activeUsers = await mlFeatureRepo.getActiveUserIdsBatch(DB_BATCH_SIZE, userOffset);
    if (activeUsers.length === 0) break;

    const entries = await computeUserFeaturesForBatch(mlFeatureRepo, activeUsers);
    await writeFeaturesInBatches(entries, version);
    totalUsers += activeUsers.length;
    userOffset += DB_BATCH_SIZE;
    if (activeUsers.length < DB_BATCH_SIZE) break;
  }

  return totalUsers;
}

export function createMlFeatureComputeWorker(deps: MlFeatureComputeDeps) {
  const { mlFeatureRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.ML_FEATURE_COMPUTE,
    async () => {
      // Version key ensures scoring reads a consistent snapshot while new features are written
      const version = Date.now().toString(36);
      logger.info('ml-feature-compute', `Starting ML feature precomputation (v${version})`);

      const totalDogs = await computeDogFeatures(mlFeatureRepo, version);
      const totalUsers = await computeUserFeatures(mlFeatureRepo, version);

      // Atomically swap pointers so scoring switches to the new version
      await swapVersionPointer('ml:features:dog:version', version);
      await swapVersionPointer('ml:features:user:version', version);

      logger.info(
        'ml-feature-compute',
        `Precomputed features for ${totalDogs} dogs and ${totalUsers} users (v${version})`,
      );
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('ml-feature-compute', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('ml-feature-compute', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
