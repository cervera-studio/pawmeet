import {
  analyticsEvents,
  experimentMetricsSnapshots,
  modelPerformanceDaily,
  swipeScoreLogs,
  userMatchingPreferences,
} from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db.js';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queue.js';

const EXPERIMENT_NAME = 'matching_algorithm_v1';
const AI_VARIANT = 'ai';

type VariantMetrics = Record<string, unknown> & {
  variant: string;
  userCount: number;
  totalDiscoveries: number;
  totalLikes: number;
  totalMatches: number;
  totalWalksCompleted: number;
  totalMessages: number;
  avgCompatibilityScore: number | null;
};

type ScoreBucket = Record<string, unknown> & {
  bucket: string;
  swipes: number;
  likes: number;
  matches: number;
  observedMatchRate: number;
};

type WeightDimension = Record<string, unknown> & {
  dimension: string;
  avgWeight: number;
  stdDev: number;
};

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
export function createExperimentMetricsWorker() {
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

      const tsFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;
      const variantExpr = sql`${analyticsEvents.properties}->>'experiment_variant'`;
      const hasVariant = sql`${variantExpr} IS NOT NULL`;

      // ── 1. Per-variant metrics from analytics_events ──────────────────────

      const variantRows = await db.execute<VariantMetrics>(sql`
        SELECT
          ${variantExpr} AS variant,
          COUNT(DISTINCT ${analyticsEvents.userId})::int AS "userCount",
          COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'match_feed_loaded')::int AS "totalDiscoveries",
          COUNT(*) FILTER (
            WHERE ${analyticsEvents.eventName} = 'match_swipe_performed'
            AND ${analyticsEvents.properties}->>'direction' = 'right'
          )::int AS "totalLikes",
          COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'match_created')::int AS "totalMatches",
          COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'walk_completed')::int AS "totalWalksCompleted",
          COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'chat_message_sent')::int AS "totalMessages",
          AVG(
            CASE WHEN ${analyticsEvents.eventName} = 'match_created'
            THEN (${analyticsEvents.properties}->>'compatibilityScore')::double precision
            END
          ) AS "avgCompatibilityScore"
        FROM ${analyticsEvents}
        WHERE ${tsFilter} AND ${hasVariant}
        GROUP BY ${variantExpr}
      `);

      // ── 2. Upsert experiment_metrics_snapshots ────────────────────────────

      if (variantRows.rows.length > 0) {
        const snapshotValues = variantRows.rows.map((row) => ({
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
          createdAt: new Date(),
        }));

        await db
          .insert(experimentMetricsSnapshots)
          .values(snapshotValues)
          .onConflictDoUpdate({
            target: [
              experimentMetricsSnapshots.experimentName,
              experimentMetricsSnapshots.snapshotDate,
              experimentMetricsSnapshots.variant,
            ],
            set: {
              userCount: sql`EXCLUDED.user_count`,
              totalDiscoveries: sql`EXCLUDED.total_discoveries`,
              totalLikes: sql`EXCLUDED.total_likes`,
              totalMatches: sql`EXCLUDED.total_matches`,
              totalWalksCompleted: sql`EXCLUDED.total_walks_completed`,
              totalMessages: sql`EXCLUDED.total_messages`,
              avgCompatibilityScore: sql`EXCLUDED.avg_compatibility_score`,
              avgMatchRate: sql`EXCLUDED.avg_match_rate`,
              createdAt: sql`now()`,
            },
          });
      }

      // ── 3. Model performance daily (AI variant only) ──────────────────────

      const swipeFilter = sql`${swipeScoreLogs.createdAt} >= ${dayStart} AND ${swipeScoreLogs.createdAt} < ${nextDayStart}`;

      // Total predictions & avg score
      const [predictionStats] = await db
        .execute<{
          totalPredictions: number;
          avgOverallScore: number | null;
        }>(sql`
        SELECT
          COUNT(*)::int AS "totalPredictions",
          AVG(${swipeScoreLogs.overallScore}) AS "avgOverallScore"
        FROM ${swipeScoreLogs}
        WHERE ${swipeFilter}
      `)
        .then((r) => r.rows);

      // AI variant match count from analytics
      const aiVariantRow = variantRows.rows.find((r) => r.variant === AI_VARIANT);
      const aiTotalMatches = aiVariantRow?.totalMatches ?? 0;

      // Score buckets (10 bins: 0.0-0.1, 0.1-0.2, ..., 0.9-1.0)
      const bucketRows = await db.execute<ScoreBucket>(sql`
        SELECT
          CONCAT(
            TO_CHAR(FLOOR(${swipeScoreLogs.overallScore} * 10) / 10, 'FM0.0'),
            '-',
            TO_CHAR(FLOOR(${swipeScoreLogs.overallScore} * 10) / 10 + 0.1, 'FM0.0')
          ) AS bucket,
          COUNT(*)::int AS swipes,
          COUNT(*) FILTER (WHERE ${swipeScoreLogs.direction} = 'like')::int AS likes,
          0::int AS matches,
          CASE
            WHEN COUNT(*) FILTER (WHERE ${swipeScoreLogs.direction} = 'like') > 0
            THEN 0.0
            ELSE 0.0
          END AS "observedMatchRate"
        FROM ${swipeScoreLogs}
        WHERE ${swipeFilter}
        GROUP BY FLOOR(${swipeScoreLogs.overallScore} * 10)
        ORDER BY FLOOR(${swipeScoreLogs.overallScore} * 10)
      `);

      // Weight distribution from user_matching_preferences
      const weightRows = await db.execute<WeightDimension>(sql`
        SELECT dimension, AVG(weight) AS "avgWeight", COALESCE(STDDEV(weight), 0) AS "stdDev"
        FROM (
          SELECT 'size' AS dimension, ${userMatchingPreferences.weightSize} AS weight FROM ${userMatchingPreferences}
          UNION ALL
          SELECT 'energy', ${userMatchingPreferences.weightEnergy} FROM ${userMatchingPreferences}
          UNION ALL
          SELECT 'behavior', ${userMatchingPreferences.weightBehavior} FROM ${userMatchingPreferences}
          UNION ALL
          SELECT 'walk', ${userMatchingPreferences.weightWalk} FROM ${userMatchingPreferences}
          UNION ALL
          SELECT 'distance', ${userMatchingPreferences.weightDistance} FROM ${userMatchingPreferences}
          UNION ALL
          SELECT 'leash', ${userMatchingPreferences.weightLeash} FROM ${userMatchingPreferences}
        ) AS dims
        GROUP BY dimension
        ORDER BY dimension
      `);

      // Success rate distribution (histogram of successRate)
      const successRateRows = await db.execute<{ bucket: string; count: number }>(sql`
        SELECT
          CONCAT(
            TO_CHAR(FLOOR(${userMatchingPreferences.successRate} * 10) / 10, 'FM0.0'),
            '-',
            TO_CHAR(FLOOR(${userMatchingPreferences.successRate} * 10) / 10 + 0.1, 'FM0.0')
          ) AS bucket,
          COUNT(*)::int AS count
        FROM ${userMatchingPreferences}
        GROUP BY FLOOR(${userMatchingPreferences.successRate} * 10)
        ORDER BY FLOOR(${userMatchingPreferences.successRate} * 10)
      `);

      // ── 4. Upsert model_performance_daily ─────────────────────────────────

      await db
        .insert(modelPerformanceDaily)
        .values({
          snapshotDate: dayStart,
          totalPredictions: predictionStats?.totalPredictions ?? 0,
          totalMatches: aiTotalMatches,
          avgOverallScore: predictionStats?.avgOverallScore ?? null,
          scoreBuckets: bucketRows.rows,
          weightDistribution: weightRows.rows,
          successRateDistribution: successRateRows.rows,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [modelPerformanceDaily.snapshotDate],
          set: {
            totalPredictions: sql`EXCLUDED.total_predictions`,
            totalMatches: sql`EXCLUDED.total_matches`,
            avgOverallScore: sql`EXCLUDED.avg_overall_score`,
            scoreBuckets: sql`EXCLUDED.score_buckets`,
            weightDistribution: sql`EXCLUDED.weight_distribution`,
            successRateDistribution: sql`EXCLUDED.success_rate_distribution`,
            createdAt: sql`now()`,
          },
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
