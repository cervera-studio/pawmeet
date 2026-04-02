import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { ExperimentMetricsJobRepository } from '../ports/experiment-metrics-job-repository.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queues/index.js';

interface ExperimentMetricsDeps {
  experimentMetricsJobRepo: ExperimentMetricsJobRepository;
}

/**
 * BullMQ worker that computes daily ML model performance metrics.
 * Scheduled daily at 03:30 UTC via repeatable job.
 *
 * Computes model_performance_daily from swipe_score_logs and matching preferences.
 * Idempotent: uses onConflictDoUpdate so re-runs overwrite with fresh values.
 */
export function createExperimentMetricsWorker(deps: ExperimentMetricsDeps) {
  const { experimentMetricsJobRepo } = deps;

  const worker = new Worker(
    QUEUE_NAMES.EXPERIMENT_METRICS,
    async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setDate(nextDayStart.getDate() + 1);

      logger.info('experiment-metrics', `Computing model performance for ${dateStr}`);

      // Total predictions & avg score from swipe_score_logs
      const predictionStats = await experimentMetricsJobRepo.getPredictionStatsForDay(
        dayStart,
        nextDayStart,
      );

      // Score buckets (10 bins: 0.0-0.1, 0.1-0.2, ..., 0.9-1.0)
      const bucketRows = await experimentMetricsJobRepo.getScoreBucketsForDay(
        dayStart,
        nextDayStart,
      );

      // Weight distribution from user_matching_preferences
      const weightRows = await experimentMetricsJobRepo.getWeightDistribution();

      // Success rate distribution (histogram of successRate)
      const successRateRows = await experimentMetricsJobRepo.getSuccessRateDistribution();

      await experimentMetricsJobRepo.upsertModelPerformance({
        snapshotDate: dayStart,
        totalPredictions: predictionStats?.totalPredictions ?? 0,
        totalMatches: 0,
        avgOverallScore: predictionStats?.avgOverallScore ?? null,
        scoreBuckets: bucketRows as unknown as Record<string, unknown>,
        weightDistribution: weightRows as unknown as Record<string, unknown>,
        successRateDistribution: successRateRows as unknown as Record<string, unknown>,
      });

      logger.info('experiment-metrics', `Model performance computed for ${dateStr}`);
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.debug('experiment-metrics', `Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('experiment-metrics', `Job ${job?.id} failed: ${err.message}`);

    const maxAttempts = job?.opts?.attempts ?? 3;
    if (job && job.attemptsMade >= maxAttempts) {
      moveToAnalyticsDlq('experiment-metrics', job.data, err.message).catch((dlqErr) => {
        logger.error('experiment-metrics', `Failed to move job ${job.id} to DLQ: ${dlqErr}`);
      });
    }
  });

  return worker;
}
