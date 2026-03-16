import {
  dogProfiles,
  messages,
  swipeScoreLogs,
  userMatchingPreferences,
  users,
  walks,
} from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { avg, count, eq, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { redis } from '../lib/redis.js';
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

/**
 * BullMQ worker that precomputes ML features for dogs and users,
 * storing them in Redis for fast access during scoring.
 * Scheduled every 4 hours via repeatable job.
 */
export function createMlFeatureComputeWorker() {
  const worker = new Worker(
    QUEUE_NAMES.ML_FEATURE_COMPUTE,
    async () => {
      logger.info('ml-feature-compute', 'Starting ML feature precomputation');

      // ── Dog features ────────────────────────────────────────────────────

      let dogOffset = 0;
      let totalDogs = 0;

      while (true) {
        const dogs = await db
          .select({
            id: dogProfiles.id,
            birthDate: dogProfiles.birthDate,
            isNeutered: dogProfiles.isNeutered,
            size: dogProfiles.size,
            energyLevel: dogProfiles.energyLevel,
            behaviorWithDogs: dogProfiles.behaviorWithDogs,
            leashBehavior: dogProfiles.leashBehavior,
            walkPrefTime: dogProfiles.walkPrefTime,
            walkPrefDurationMin: dogProfiles.walkPrefDurationMin,
            walkPrefDurationMax: dogProfiles.walkPrefDurationMax,
            walkPrefTerrain: dogProfiles.walkPrefTerrain,
          })
          .from(dogProfiles)
          .where(eq(dogProfiles.isActive, true))
          .limit(DB_BATCH_SIZE)
          .offset(dogOffset);

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
          return {
            key: `ml:features:dog:${dog.id}`,
            value: JSON.stringify(features),
          };
        });

        await writeFeaturesInBatches(entries);
        totalDogs += dogs.length;
        dogOffset += DB_BATCH_SIZE;

        if (dogs.length < DB_BATCH_SIZE) break;
      }

      // ── User features ───────────────────────────────────────────────────

      let userOffset = 0;
      let totalUsers = 0;

      while (true) {
        const activeUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.isActive, true))
          .limit(DB_BATCH_SIZE)
          .offset(userOffset);

        if (activeUsers.length === 0) break;

        const entries: Array<{ key: string; value: string }> = [];

        for (const user of activeUsers) {
          // Like rate: likes / total swipes (via swipe_score_logs through user's dogs)
          const [swipeStats] = await db
            .select({
              total: count(),
              likes: sql<number>`count(*) filter (where ${swipeScoreLogs.direction} = 'like')`,
            })
            .from(swipeScoreLogs)
            .innerJoin(dogProfiles, eq(swipeScoreLogs.swiperDogId, dogProfiles.id))
            .where(eq(dogProfiles.ownerId, user.id));

          const totalSwipes = swipeStats?.total ?? 0;
          const likeRate = totalSwipes > 0 ? Number(swipeStats?.likes ?? 0) / totalSwipes : 0;

          // Match success rate and sample size from user_matching_preferences
          const [matchPrefs] = await db
            .select({
              successRate: userMatchingPreferences.successRate,
              sampleSize: userMatchingPreferences.sampleSize,
            })
            .from(userMatchingPreferences)
            .where(eq(userMatchingPreferences.userId, user.id));

          // Avg chat messages per match
          const [msgStats] = await db
            .select({
              avgMessages: avg(sql<number>`msg_count`),
            })
            .from(
              db
                .select({
                  matchId: messages.matchId,
                  msg_count: count().as('msg_count'),
                })
                .from(messages)
                .where(eq(messages.senderId, user.id))
                .groupBy(messages.matchId)
                .as('msg_per_match'),
            );

          // Walk completion rate: completed / total proposed
          const [walkStats] = await db
            .select({
              total: count(),
              completed: sql<number>`count(*) filter (where ${walks.status} = 'completed')`,
            })
            .from(walks)
            .where(eq(walks.createdBy, user.id));

          const totalWalks = walkStats?.total ?? 0;

          const features: UserFeatures = {
            likeRate,
            matchSuccessRate: matchPrefs?.successRate ?? 0,
            avgChatMessages: Number(msgStats?.avgMessages ?? 0),
            walkCompletionRate: totalWalks > 0 ? Number(walkStats?.completed ?? 0) / totalWalks : 0,
            sampleSize: matchPrefs?.sampleSize ?? 0,
          };

          entries.push({
            key: `ml:features:user:${user.id}`,
            value: JSON.stringify(features),
          });
        }

        await writeFeaturesInBatches(entries);
        totalUsers += activeUsers.length;
        userOffset += DB_BATCH_SIZE;

        if (activeUsers.length < DB_BATCH_SIZE) break;
      }

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
