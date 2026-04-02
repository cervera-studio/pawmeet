import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import { createCreateWeeklyChallenges } from '../use-cases/create-weekly-challenges.js';
import { getRedisConnection, QUEUE_NAMES } from './queues/index.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

export function createWeeklyChallengeRotationWorker(deps: Deps): Worker {
  const createWeeklyChallenges = createCreateWeeklyChallenges(deps);

  const worker = new Worker(
    QUEUE_NAMES.WEEKLY_CHALLENGES,
    async () => {
      const result = await createWeeklyChallenges();
      if (result.success) {
        logger.info(
          'WeeklyChallenges',
          `Created ${result.data.challenges.length} challenges for the upcoming week`,
        );
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', () => {
    logger.info('WeeklyChallenges', 'Weekly challenge rotation completed');
  });
  worker.on('failed', (_job, err) => {
    logger.error('WeeklyChallenges', 'Weekly challenge rotation failed', err.message);
  });

  return worker;
}
