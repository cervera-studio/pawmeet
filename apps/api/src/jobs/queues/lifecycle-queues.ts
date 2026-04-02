import { createLazyQueue } from './connection.js';

// --- Queue getters ---

export const getStoryCleanupQueue = createLazyQueue('story-cleanup', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 50,
  removeOnFail: 100,
});

export const getEventStatusQueue = createLazyQueue('event-status', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 50,
  removeOnFail: 100,
});

export const getDataCleanupQueue = createLazyQueue('data-cleanup', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 50,
  removeOnFail: 100,
});

export const getGpsRetentionQueue = createLazyQueue('gps-retention', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 50,
  removeOnFail: 100,
});

// Note: recurring-event queue name is defined in QUEUE_NAMES but had no queue instance in the
// original file. It is included in the QUEUE_NAMES constant for completeness.

// --- Enqueue helpers ---

export async function enqueueStoryCleanup() {
  return getStoryCleanupQueue().add('cleanup', {}, { repeat: { every: 60 * 60 * 1000 } });
}

export async function enqueueDataCleanup() {
  return getDataCleanupQueue().add('cleanup', {}, { repeat: { every: 24 * 60 * 60 * 1000 } });
}

export async function enqueueGpsRetention() {
  return getGpsRetentionQueue().add('retention', {}, { repeat: { every: 24 * 60 * 60 * 1000 } });
}

// --- Schedule helpers ---

/** Schedule story cleanup every hour. */
export async function scheduleStoryCleanup() {
  const queue = getStoryCleanupQueue();
  await queue.upsertJobScheduler(
    'hourly-story-cleanup',
    { pattern: '0 * * * *' },
    { name: 'cleanup' },
  );
}

/** Schedule daily data cleanup at 03:00 UTC (after analytics aggregation at 02:00). */
export async function scheduleDataCleanup() {
  const queue = getDataCleanupQueue();
  await queue.upsertJobScheduler(
    'daily-data-cleanup',
    { pattern: '0 3 * * *' },
    { name: 'cleanup' },
  );
}

/** Schedule daily GPS data retention purge at 04:00 UTC (after data cleanup at 03:00). */
export async function scheduleGpsRetention() {
  const queue = getGpsRetentionQueue();
  await queue.upsertJobScheduler(
    'daily-gps-retention',
    { pattern: '0 4 * * *' },
    { name: 'retention' },
  );
}
