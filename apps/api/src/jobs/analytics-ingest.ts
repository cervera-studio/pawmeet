import { ANALYTICS_MAX_EVENT_AGE_DAYS, ANALYTICS_WORKER_CONCURRENCY } from '@pawmeet/config';
import { analyticsEvents } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { db } from '../lib/db.js';
import type { AnalyticsJobData } from './queue.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

export function createAnalyticsWorker() {
  const maxAgeMs = ANALYTICS_MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000;

  const worker = new Worker<AnalyticsJobData>(
    QUEUE_NAMES.ANALYTICS,
    async (job) => {
      const { events } = job.data;
      const now = Date.now();

      // Filter out events older than max age
      const valid = events.filter((e) => {
        const age = now - new Date(e.clientTimestamp).getTime();
        return age < maxAgeMs && age > -60_000; // Allow 1 min clock skew into future
      });

      if (valid.length === 0) return;

      // Batch insert with ON CONFLICT DO NOTHING for deduplication
      const values = valid.map((e) => ({
        clientEventId: e.clientEventId,
        userId: e.userId,
        sessionId: e.sessionId ?? null,
        eventName: e.eventName,
        properties: e.properties ?? null,
        clientTimestamp: new Date(e.clientTimestamp),
        platform: e.platform,
        appVersion: e.appVersion ?? null,
        screenName: e.screenName ?? null,
        schemaVersion: 1,
      }));

      await db.insert(analyticsEvents).values(values).onConflictDoNothing({
        target: analyticsEvents.clientEventId,
      });

      logger.debug('analytics', `Ingested ${valid.length}/${events.length} events`);
    },
    { connection: getRedisConnection(), concurrency: ANALYTICS_WORKER_CONCURRENCY },
  );

  worker.on('completed', (job) => {
    logger.debug('analytics', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('analytics', `Job ${job?.id} failed: ${err.message}`);

    // Move to DLQ after all retries exhausted
    const maxAttempts = job?.opts?.attempts ?? 3;
    if (job && job.attemptsMade >= maxAttempts) {
      moveToAnalyticsDlq('ingest', job.data, err.message).catch((dlqErr) => {
        logger.error('analytics', `Failed to move job ${job.id} to DLQ: ${dlqErr}`);
      });
    }
  });

  return worker;
}
