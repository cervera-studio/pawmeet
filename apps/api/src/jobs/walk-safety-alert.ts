import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { WalkJobRepository } from '../ports/walk-job-repository.js';
import { enqueueNotification, getRedisConnection } from './queue.js';

const WALK_SAFETY_ALERT = 'walk-safety-alert';

interface WalkSafetyAlertDeps {
  walkJobRepo: WalkJobRepository;
}

/**
 * Auto-alert for overdue walks.
 * Runs every 5 minutes. If an accepted walk's expected end time has passed
 * by 15+ minutes with no completion, sends a safety alert to both users.
 */
export function createWalkSafetyAlertWorker(deps: WalkSafetyAlertDeps) {
  const { walkJobRepo } = deps;

  const worker = new Worker(
    WALK_SAFETY_ALERT,
    async () => {
      const now = new Date();
      const maxAgeMs = 24 * 60 * 60 * 1000;

      // Find accepted walks where scheduledAt + durationMin + 15 min buffer < NOW
      const overdueWalks = await walkJobRepo.findOverdueWalks(now, maxAgeMs);

      if (overdueWalks.length === 0) return;

      logger.info('walk-safety-alert', `Found ${overdueWalks.length} overdue walks`);

      for (const walk of overdueWalks) {
        const ownerIds = await walkJobRepo.getMatchDogOwnerIds(walk.matchId);

        const title = '⚠️ Passeggiata in ritardo';
        const body = `La passeggiata "${walk.title ?? 'Passeggiata'}" dovrebbe essere terminata. Tutto bene?`;

        for (const ownerId of ownerIds) {
          await enqueueNotification({
            userId: ownerId,
            title,
            body,
            data: { type: 'walk_overdue', walkId: walk.id },
          });
        }

        // Mark walk as completed to avoid repeated alerts
        await walkJobRepo.markWalkCompleted(walk.id, now);
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error('walk-safety-alert', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

/** Schedule walk safety alert check every 5 minutes. */
export async function scheduleWalkSafetyAlerts() {
  const { Queue } = await import('bullmq');
  const queue = new Queue(WALK_SAFETY_ALERT, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  });
  await queue.upsertJobScheduler(
    'walk-safety-alert-check',
    { pattern: '*/5 * * * *' },
    { name: 'check' },
  );
}
