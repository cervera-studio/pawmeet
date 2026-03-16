import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { WalkJobRepository } from '../ports/walk-job-repository.js';
import { enqueueNotification, getRedisConnection } from './queue.js';

const WALK_REMINDER = 'walk-reminder';

interface WalkReminderDeps {
  walkJobRepo: WalkJobRepository;
}

/**
 * Finds accepted walks starting soon and sends push reminders.
 * Runs every 5 minutes via cron. Sends at two windows:
 * - 1 hour before (55-65 min window)
 * - 15 minutes before (10-20 min window)
 */
export function createWalkReminderWorker(deps: WalkReminderDeps) {
  const { walkJobRepo } = deps;

  const worker = new Worker(
    WALK_REMINDER,
    async () => {
      const now = new Date();

      // 1-hour reminder window: walks starting in 55-65 min
      const oneHourFrom = new Date(now.getTime() + 55 * 60 * 1000);
      const oneHourTo = new Date(now.getTime() + 65 * 60 * 1000);

      // 15-minute reminder window: walks starting in 10-20 min
      const fifteenMinFrom = new Date(now.getTime() + 10 * 60 * 1000);
      const fifteenMinTo = new Date(now.getTime() + 20 * 60 * 1000);

      const upcomingWalks = await walkJobRepo.findUpcomingAcceptedWalks([
        { from: oneHourFrom, to: oneHourTo },
        { from: fifteenMinFrom, to: fifteenMinTo },
      ]);

      if (upcomingWalks.length === 0) return;

      logger.info('walk-reminder', `Found ${upcomingWalks.length} walks needing reminders`);

      for (const walk of upcomingWalks) {
        const ownerIds = await walkJobRepo.getMatchDogOwnerIds(walk.matchId);

        const minutesUntil = Math.round((walk.scheduledAt.getTime() - now.getTime()) / (60 * 1000));
        const timeLabel = minutesUntil > 30 ? '1 ora' : `${minutesUntil} minuti`;
        const title = '🐾 Passeggiata in arrivo!';
        const body = walk.location
          ? `Tra ${timeLabel} — ${walk.title ?? 'Passeggiata'} a ${walk.location}`
          : `Tra ${timeLabel} — ${walk.title ?? 'Passeggiata'}`;

        for (const ownerId of ownerIds) {
          await enqueueNotification({
            userId: ownerId,
            title,
            body,
            data: { type: 'walk_reminder', walkId: walk.id },
          });
        }
      }
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('failed', (job, err) => {
    logger.error('walk-reminder', `Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

/** Schedule walk reminder check every 5 minutes. */
export async function scheduleWalkReminders() {
  const { Queue } = await import('bullmq');
  const queue = new Queue(WALK_REMINDER, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  });
  await queue.upsertJobScheduler(
    'walk-reminder-check',
    { pattern: '*/5 * * * *' },
    { name: 'check' },
  );
}
