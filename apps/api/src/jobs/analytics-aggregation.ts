import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { AnalyticsJobRepository } from '../ports/analytics-job-repository.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

interface AnalyticsAggregationDeps {
  analyticsJobRepo: AnalyticsJobRepository;
}

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
export function createAnalyticsAggregationWorker(deps: AnalyticsAggregationDeps) {
  const { analyticsJobRepo } = deps;

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

      // Total event count for the day
      const eventCount = await analyticsJobRepo.getEventCountForDay(dayStart, nextDayStart);

      // Unique users for the day
      const uniqueUsers = await analyticsJobRepo.getUniqueUsersForDay(dayStart, nextDayStart);

      // Per-event counts
      const eventCounts = await analyticsJobRepo.getEventCountsByName(dayStart, nextDayStart);

      // Upsert all metrics — onConflictDoUpdate ensures re-runs overwrite correctly
      const metrics = [
        { date: dayStart, metricName: 'event_count', value: eventCount },
        { date: dayStart, metricName: 'unique_users', value: uniqueUsers },
        ...eventCounts.map((row) => ({
          date: dayStart,
          metricName: `event:${row.eventName}`,
          value: row.value,
        })),
      ];

      if (metrics.length > 0) {
        await analyticsJobRepo.upsertDailyMetrics(metrics);
      }

      logger.info(
        'analytics-aggregation',
        `Aggregated ${metrics.length} metrics for ${dateStr} (${eventCount} events, ${uniqueUsers} unique users)`,
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
