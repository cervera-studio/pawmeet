import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import type { ExperimentMetricsJobRepository } from '../ports/experiment-metrics-job-repository.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

const EXPERIMENT_NAME = 'matching_algorithm_v1';
const AI_VARIANT = 'ai';

interface ExperimentMetricsDeps {
  experimentMetricsJobRepo: ExperimentMetricsJobRepository;
}

/**
 * BullMQ worker that computes daily A/B experiment metrics snapshots.
 * Scheduled daily at 03:30 UTC via repeatable job.
 *
 * 1. Aggregates analytics_events by experiment_variant for yesterday
 * 2. Upserts into experiment_metrics_snapshots (one row per variant)
 * 3. Computes model_performance_daily for AI variant (score buckets, weight distribution)
 * 4. Upserts into model_performance_daily
 *
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

      logger.info('experiment-metrics', `Computing snapshot for ${dateStr}`);

      // ── 1. Per-variant metrics from analytics_events ──────────────────────

      const variantRows = await experimentMetricsJobRepo.getVariantMetricsForDay(
        { dayStart, nextDayStart },
        EXPERIMENT_NAME,
      );

      // ── 2. Upsert experiment_metrics_snapshots ────────────────────────────

      if (variantRows.length > 0) {
        const snapshotValues = variantRows.map((row) => ({
          experimentName: EXPERIMENT_NAME,
          snapshotDate: dayStart,
          variant: row.variant,
          userCount: row.userCount,
          totalDiscoveries: row.totalDiscoveries,
          totalLikes: row.totalLikes,
          totalMatches: row.totalMatches,
          totalWalksCompleted: row.totalWalksCompleted,
          totalMessages: row.totalMessages,
          avgCompatibilityScore: row.avgCompatibilityScore,
          avgMatchRate: row.totalLikes > 0 ? row.totalMatches / row.totalLikes : 0,
        }));

        await experimentMetricsJobRepo.upsertExperimentSnapshots(snapshotValues);
      }

      // ── 3. Model performance daily (AI variant only) ──────────────────────

      // Total predictions & avg score
      const predictionStats = await experimentMetricsJobRepo.getPredictionStatsForDay(
        dayStart,
        nextDayStart,
      );

      // AI variant match count from analytics
      const aiVariantRow = variantRows.find((r) => r.variant === AI_VARIANT);
      const aiTotalMatches = aiVariantRow?.totalMatches ?? 0;

      // Score buckets (10 bins: 0.0-0.1, 0.1-0.2, ..., 0.9-1.0)
      const bucketRows = await experimentMetricsJobRepo.getScoreBucketsForDay(
        dayStart,
        nextDayStart,
      );

      // Weight distribution from user_matching_preferences
      const weightRows = await experimentMetricsJobRepo.getWeightDistribution();

      // Success rate distribution (histogram of successRate)
      const successRateRows = await experimentMetricsJobRepo.getSuccessRateDistribution();

      // ── 4. Upsert model_performance_daily ─────────────────────────────────

      await experimentMetricsJobRepo.upsertModelPerformance({
        snapshotDate: dayStart,
        totalPredictions: predictionStats?.totalPredictions ?? 0,
        totalMatches: aiTotalMatches,
        avgOverallScore: predictionStats?.avgOverallScore ?? null,
        scoreBuckets: bucketRows as unknown as Record<string, unknown>,
        weightDistribution: weightRows as unknown as Record<string, unknown>,
        successRateDistribution: successRateRows as unknown as Record<string, unknown>,
      });

      logger.info('experiment-metrics', `Snapshot computed for ${dateStr}`);
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
