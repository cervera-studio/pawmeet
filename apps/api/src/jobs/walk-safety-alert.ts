import { walks } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { enqueueNotification, getRedisConnection } from './queue.js';

const WALK_SAFETY_ALERT = 'walk-safety-alert';

/**
 * Auto-alert for overdue walks.
 * Runs every 5 minutes. If an accepted walk's expected end time has passed
 * by 15+ minutes with no completion, sends a safety alert to both users.
 */
export function createWalkSafetyAlertWorker() {
  const worker = new Worker(
    WALK_SAFETY_ALERT,
    async () => {
      const now = new Date();

      // Find accepted walks where scheduledAt + durationMin + 15 min buffer < NOW
      // i.e., the walk should have ended 15+ minutes ago but is still 'accepted'
      const overdueWalks = await db
        .select({
          id: walks.id,
          title: walks.title,
          matchId: walks.matchId,
          createdBy: walks.createdBy,
          scheduledAt: walks.scheduledAt,
          durationMin: walks.durationMin,
        })
        .from(walks)
        .where(
          and(
            eq(walks.status, 'accepted'),
            sql`${walks.scheduledAt} + (${walks.durationMin} + 15) * INTERVAL '1 minute' < ${now}`,
            // Only alert for walks from the last 24 hours (avoid stale data)
            sql`${walks.scheduledAt} > ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`,
          ),
        );

      if (overdueWalks.length === 0) return;

      logger.info('walk-safety-alert', `Found ${overdueWalks.length} overdue walks`);

      // Import lazily to avoid circular deps
      const { dogProfiles, matches } = await import('@pawmeet/db');

      for (const walk of overdueWalks) {
        const match = await db
          .select({ dogAId: matches.dogAId, dogBId: matches.dogBId })
          .from(matches)
          .where(eq(matches.id, walk.matchId))
          .limit(1);

        if (!match[0]) continue;

        const dogs = await db
          .select({ ownerId: dogProfiles.ownerId })
          .from(dogProfiles)
          .where(sql`${dogProfiles.id} IN (${match[0].dogAId}, ${match[0].dogBId})`);

        const title = '⚠️ Passeggiata in ritardo';
        const body = `La passeggiata "${walk.title ?? 'Passeggiata'}" dovrebbe essere terminata. Tutto bene?`;

        for (const dog of dogs) {
          await enqueueNotification({
            userId: dog.ownerId,
            title,
            body,
            data: { type: 'walk_overdue', walkId: walk.id },
          });
        }

        // Mark walk as completed to avoid repeated alerts
        await db
          .update(walks)
          .set({ status: 'completed', updatedAt: now })
          .where(eq(walks.id, walk.id));
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
