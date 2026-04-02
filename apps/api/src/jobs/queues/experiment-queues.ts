import { createLazyQueue } from './connection.js';

// --- Queue getters ---

export const getExperimentMetricsQueue = createLazyQueue('experiment-metrics', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

export const getExperimentGuardrailsQueue = createLazyQueue('experiment-guardrails', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 30,
  removeOnFail: 100,
});

// --- Schedule helpers ---

/** Schedule daily experiment metrics snapshot at 03:30 UTC. */
export async function scheduleExperimentMetrics() {
  const queue = getExperimentMetricsQueue();
  await queue.upsertJobScheduler(
    'daily-experiment-metrics',
    { pattern: '30 3 * * *' },
    { name: 'snapshot' },
  );
}

/** Schedule daily experiment guardrail check at 04:30 UTC. */
export async function scheduleExperimentGuardrails() {
  const queue = getExperimentGuardrailsQueue();
  await queue.upsertJobScheduler(
    'daily-experiment-guardrails',
    { pattern: '30 4 * * *' },
    { name: 'check' },
  );
}
