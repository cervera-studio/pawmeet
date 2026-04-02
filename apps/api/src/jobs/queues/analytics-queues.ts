import { createLazyQueue } from './connection.js';

// --- Queue getters ---

export const getAnalyticsQueue = createLazyQueue('analytics', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 200,
  removeOnFail: 500,
});

export const getAnalyticsDlqQueue = createLazyQueue('analytics-dlq', {
  removeOnComplete: 500,
  removeOnFail: false, // keep failed DLQ jobs for inspection
});

// --- Job data types ---

export interface AnalyticsJobData {
  events: Array<{
    clientEventId: string;
    userId: string | null;
    sessionId?: string;
    eventName: string;
    properties?: Record<string, unknown>;
    clientTimestamp: string;
    platform: string;
    appVersion?: string;
    screenName?: string;
  }>;
}

// --- Enqueue helpers ---

export async function enqueueAnalyticsEvents(data: AnalyticsJobData) {
  return getAnalyticsQueue().add('ingest', data);
}

/** Move a failed analytics job to the dead-letter queue. */
export async function moveToAnalyticsDlq(
  jobName: string,
  data: unknown,
  error: string,
): Promise<void> {
  await getAnalyticsDlqQueue().add('dead-letter', {
    originalJob: jobName,
    data,
    error,
    failedAt: new Date().toISOString(),
  });
}
