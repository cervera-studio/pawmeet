import { dogProfiles, matches, walks } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { enqueueNotification, getRedisConnection } from './queue.js';

const WALK_REMINDER = 'walk-reminder';

/**
 * Finds accepted walks starting soon and sends push reminders.
 * Runs every 5 minutes via cron. Sends at two windows:
 * - 1 hour before (55-65 min window)
 * - 15 minutes before (10-20 min window)
 */
export function createWalkReminderWorker() {
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

      const upcomingWalks = await db
        .select({
          id: walks.id,
          title: walks.title,
          scheduledAt: walks.scheduledAt,
          location: walks.location,
          createdBy: walks.createdBy,
          matchId: walks.matchId,
        })
        .from(walks)
        .where(
          and(
            eq(walks.status, 'accepted'),
            sql`(${walks.scheduledAt} BETWEEN ${oneHourFrom} AND ${oneHourTo}
              OR ${walks.scheduledAt} BETWEEN ${fifteenMinFrom} AND ${fifteenMinTo})`,
          ),
        );

      if (upcomingWalks.length === 0) return;

      logger.info('walk-reminder', `Found ${upcomingWalks.length} walks needing reminders`);

      for (const walk of upcomingWalks) {
        const match = await db
          .select({ dogAId: matches.dogAId, dogBId: matches.dogBId })
          .from(matches)
          .where(eq(matches.id, walk.matchId))
          .limit(1);

        if (!match[0]) continue;

        // Get owner user IDs from dog profiles
        const dogs = await db
          .select({ ownerId: dogProfiles.ownerId })
          .from(dogProfiles)
          .where(sql`${dogProfiles.id} IN (${match[0].dogAId}, ${match[0].dogBId})`);

        const minutesUntil = Math.round((walk.scheduledAt.getTime() - now.getTime()) / (60 * 1000));
        const timeLabel = minutesUntil > 30 ? '1 ora' : `${minutesUntil} minuti`;
        const title = '🐾 Passeggiata in arrivo!';
        const body = walk.location
          ? `Tra ${timeLabel} — ${walk.title ?? 'Passeggiata'} a ${walk.location}`
          : `Tra ${timeLabel} — ${walk.title ?? 'Passeggiata'}`;

        for (const dog of dogs) {
          await enqueueNotification({
            userId: dog.ownerId,
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
