import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import type { MlFeatureRepository } from '../ports/ml-feature-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

const FEATURE_TTL_SECONDS = 8 * 60 * 60; // 8 hours
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

async function writeFeaturesInBatches(
  entries: Array<{ key: string; value: string }>,
): Promise<void> {
  for (let i = 0; i < entries.length; i += REDIS_BATCH_SIZE) {
    const batch = entries.slice(i, i + REDIS_BATCH_SIZE);
    const pipeline = redis.pipeline();
    for (const { key, value } of batch) {
      pipeline.set(key, value, { ex: FEATURE_TTL_SECONDS });
    }
    await pipeline.exec();
  }
}

interface MlFeatureComputeDeps {
  mlFeatureRepo: MlFeatureRepository;
}

/**
 * BullMQ worker that precomputes ML features for dogs and users,
 * storing them in Redis for fast access during scoring.
 * Scheduled every 4 hours via repeatable job.
 */
async function computeDogFeatures(mlFeatureRepo: MlFeatureRepository): Promise<number> {
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

    await writeFeaturesInBatches(entries);
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
  const entries: Array<{ key: string; value: string }> = [];

  for (const user of users) {
    const swipeStats = await mlFeatureRepo.getUserSwipeStats(user.id);
    const likeRate = swipeStats.total > 0 ? swipeStats.likes / swipeStats.total : 0;
    const matchPrefs = await mlFeatureRepo.getUserMatchPrefs(user.id);
    const avgMessages = await mlFeatureRepo.getUserAvgMessages(user.id);
    const walkStats = await mlFeatureRepo.getUserWalkStats(user.id);

    const features: UserFeatures = {
      likeRate,
      matchSuccessRate: matchPrefs?.successRate ?? 0,
      avgChatMessages: avgMessages,
      walkCompletionRate: walkStats.total > 0 ? walkStats.completed / walkStats.total : 0,
      sampleSize: matchPrefs?.sampleSize ?? 0,
    };

    entries.push({ key: `ml:features:user:${user.id}`, value: JSON.stringify(features) });
  }

  return entries;
}

async function computeUserFeatures(mlFeatureRepo: MlFeatureRepository): Promise<number> {
  let userOffset = 0;
  let totalUsers = 0;

  while (true) {
    const activeUsers = await mlFeatureRepo.getActiveUserIdsBatch(DB_BATCH_SIZE, userOffset);
    if (activeUsers.length === 0) break;

    const entries = await computeUserFeaturesForBatch(mlFeatureRepo, activeUsers);
    await writeFeaturesInBatches(entries);
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
      logger.info('ml-feature-compute', 'Starting ML feature precomputation');

      const totalDogs = await computeDogFeatures(mlFeatureRepo);
      const totalUsers = await computeUserFeatures(mlFeatureRepo);

      logger.info(
        'ml-feature-compute',
        `Precomputed features for ${totalDogs} dogs and ${totalUsers} users`,
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
