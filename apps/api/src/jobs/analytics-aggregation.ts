import { analyticsDailyMetrics, analyticsEvents } from '@dogwalk/db';
import { logger } from '@dogwalk/utils';
import { Worker } from 'bullmq';
import { count, sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

/**
 * BullMQ worker that aggregates analytics_events into analytics_daily_metrics.
 * Scheduled daily at 02:00 UTC via repeatable job.
 *
 * Metrics computed per day:
 * - event_count: total events
 * - unique_users: distinct userId count
 * - Per event name: count of each event type (e.g. auth_registration_completed, match_created)
 *
 * Idempotent: uses onConflictDoUpdate so re-runs overwrite with fresh values.
 */
export function createAnalyticsAggregationWorker() {
  const worker = new Worker(
    QUEUE_NAMES.ANALYTICS_AGGREGATION,
    async () => {
      // Aggregate yesterday by default
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);

      // Use [dayStart, nextDayStart) to avoid missing events at exact midnight
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setDate(nextDayStart.getDate() + 1);

      logger.info('analytics-aggregation', `Aggregating metrics for ${dateStr}`);

      const tsFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;

      // Total event count for the day
      const [eventCountRow] = await db
        .select({ value: count() })
        .from(analyticsEvents)
        .where(tsFilter);

      // Unique users for the day
      const [uniqueUsersRow] = await db
        .select({ value: sql<number>`count(distinct ${analyticsEvents.userId})` })
        .from(analyticsEvents)
        .where(sql`${tsFilter} AND ${analyticsEvents.userId} IS NOT NULL`);

      // Per-event counts
      const eventCounts = await db
        .select({
          eventName: analyticsEvents.eventName,
          value: count(),
        })
        .from(analyticsEvents)
        .where(tsFilter)
        .groupBy(analyticsEvents.eventName);

      // Upsert all metrics — onConflictDoUpdate ensures re-runs overwrite correctly
      const metrics = [
        { date: dateStr, metricName: 'event_count', value: eventCountRow?.value ?? 0 },
        { date: dateStr, metricName: 'unique_users', value: Number(uniqueUsersRow?.value ?? 0) },
        ...eventCounts.map((row) => ({
          date: dateStr,
          metricName: `event:${row.eventName}`,
          value: row.value,
        })),
      ];

      for (const metric of metrics) {
        await db
          .insert(analyticsDailyMetrics)
          .values({ ...metric, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: [analyticsDailyMetrics.date, analyticsDailyMetrics.metricName],
            set: {
              value: sql`EXCLUDED.value`,
              updatedAt: sql`now()`,
            },
          });
      }

      logger.info(
        'analytics-aggregation',
        `Aggregated ${metrics.length} metrics for ${dateStr} (${eventCountRow?.value ?? 0} events, ${uniqueUsersRow?.value ?? 0} unique users)`,
      );
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('analytics-aggregation', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('analytics-aggregation', `Job ${job?.id} failed: ${err.message}`);

    // Move to DLQ after all retries exhausted
    const maxAttempts = job?.opts?.attempts ?? 3;
    if (job && job.attemptsMade >= maxAttempts) {
      moveToAnalyticsDlq('aggregation', job.data, err.message).catch((dlqErr) => {
        logger.error('analytics-aggregation', `Failed to move job ${job.id} to DLQ: ${dlqErr}`);
      });
    }
  });

  return worker;
}
