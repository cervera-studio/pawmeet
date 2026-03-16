import type { DogProfile } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { RuleBasedStrategy } from '../domain/scoring-strategy.js';
import { redis } from '../lib/redis.js';
import type { MlRecommendationsRepository } from '../ports/ml-recommendations-repository.js';
import { getRedisConnection, QUEUE_NAMES } from './queue.js';

const USER_BATCH_SIZE = 100;
const TOP_K = 50;
const RECS_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const ACTIVE_DAYS = 7;

interface MlRecommendationsDeps {
  mlRecommendationsRepo: MlRecommendationsRepository;
}

/**
 * BullMQ worker that precomputes top 50 recommended candidates per active user.
 * Scheduled every 2 hours. Results stored as Redis sorted sets (ml:recs:{userId}).
 */
export function createMlRecommendationsWorker(deps: MlRecommendationsDeps) {
  const { mlRecommendationsRepo } = deps;
  const strategy = new RuleBasedStrategy();

  const worker = new Worker(
    QUEUE_NAMES.ML_RECOMMENDATIONS,
    async () => {
      logger.info('ml-recommendations', 'Starting ML recommendations precomputation');

      const activeThreshold = new Date();
      activeThreshold.setDate(activeThreshold.getDate() - ACTIVE_DAYS);

      let offset = 0;
      let totalProcessed = 0;

      while (true) {
        // Fetch batch of active users with location
        const activeUsers = await mlRecommendationsRepo.getActiveUsersWithLocationBatch(
          activeThreshold,
          USER_BATCH_SIZE,
          offset,
        );

        if (activeUsers.length === 0) break;

        for (const user of activeUsers) {
          if (!user.latitude || !user.longitude) continue;

          try {
            await computeRecommendationsForUser(mlRecommendationsRepo, user, strategy);
          } catch (err) {
            logger.error(
              'ml-recommendations',
              `Failed for user ${user.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        totalProcessed += activeUsers.length;
        offset += USER_BATCH_SIZE;

        logger.debug('ml-recommendations', `Processed ${totalProcessed} users so far`);

        if (activeUsers.length < USER_BATCH_SIZE) break;
      }

      logger.info('ml-recommendations', `Precomputed recommendations for ${totalProcessed} users`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('ml-recommendations', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('ml-recommendations', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

async function computeRecommendationsForUser(
  mlRecommendationsRepo: MlRecommendationsRepository,
  user: { id: string; latitude: number | null; longitude: number | null; searchRadiusKm: number },
  strategy: RuleBasedStrategy,
) {
  // 1. Get user's dogs
  const userDogs = await mlRecommendationsRepo.getUserActiveDogs(user.id);

  if (userDogs.length === 0) return;

  // 2. Get blocked user IDs (both directions)
  const blockedIds = await mlRecommendationsRepo.getBlockedUserIds(user.id);
  const blockerIds = await mlRecommendationsRepo.getBlockerUserIds(user.id);

  const blockedUserIds = new Set([...blockedIds, ...blockerIds]);

  // 3. Get already-swiped dog IDs (from all user's dogs)
  const userDogIds = userDogs.map((d) => d.id);
  const swipedDogIds = new Set(await mlRecommendationsRepo.getSwipedDogIds(userDogIds));

  // 4. Find nearby candidate dogs (PostGIS)
  const nearbyDogs = await mlRecommendationsRepo.getNearbyDogsWithDistance(
    user.id,
    user.latitude!,
    user.longitude!,
    user.searchRadiusKm,
  );

  // 5. Filter out blocked and already-swiped, then score
  const candidates: Array<{ dogId: string; score: number }> = [];

  for (const candidate of nearbyDogs) {
    if (blockedUserIds.has(candidate.ownerId)) continue;
    if (swipedDogIds.has(candidate.id)) continue;

    // Score against the user's best dog (highest compatibility)
    let bestScore = 0;
    for (const userDog of userDogs) {
      const breakdown = await strategy.score(
        userDog as unknown as DogProfile,
        candidate as unknown as DogProfile,
        candidate.distanceKm,
      );
      if (breakdown.overallScore > bestScore) {
        bestScore = breakdown.overallScore;
      }
    }

    candidates.push({ dogId: candidate.id, score: bestScore });
  }

  // 6. Sort by score descending, take top K
  candidates.sort((a, b) => b.score - a.score);
  const topCandidates = candidates.slice(0, TOP_K);

  if (topCandidates.length === 0) return;

  // 7. Store in Redis sorted set
  const redisKey = `ml:recs:${user.id}`;
  const pipeline = redis.pipeline();
  pipeline.del(redisKey);
  for (const c of topCandidates) {
    pipeline.zadd(redisKey, { score: c.score, member: c.dogId });
  }
  pipeline.expire(redisKey, RECS_TTL_SECONDS);
  await pipeline.exec();
}
