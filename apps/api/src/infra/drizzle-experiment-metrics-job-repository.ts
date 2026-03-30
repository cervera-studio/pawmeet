import {
  analyticsEvents,
  experimentMetricsSnapshots,
  modelPerformanceDaily,
  swipeScoreLogs,
  userMatchingPreferences,
} from '@pawmeet/db';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  ExperimentMetricsJobRepository,
  PredictionStats,
  ScoreBucket,
  VariantMetrics,
  WeightDimension,
} from '../ports/experiment-metrics-job-repository.js';

export class DrizzleExperimentMetricsJobRepository implements ExperimentMetricsJobRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async getVariantMetricsForDay(
    tsFilter: { dayStart: Date; nextDayStart: Date },
    _experimentName: string,
  ): Promise<VariantMetrics[]> {
    const { dayStart, nextDayStart } = tsFilter;
    const tsCondition = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;
    const variantExpr = sql`${analyticsEvents.properties}->>'experiment_variant'`;
    const hasVariant = sql`${variantExpr} IS NOT NULL`;

    const variantRows = await this.db.execute<VariantMetrics>(sql`
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
      WHERE ${tsCondition} AND ${hasVariant}
      GROUP BY ${variantExpr}
    `);

    return variantRows.rows;
  }

  async upsertExperimentSnapshots(
    values: {
      experimentName: string;
      snapshotDate: Date;
      variant: string;
      userCount: number;
      totalDiscoveries: number;
      totalLikes: number;
      totalMatches: number;
      totalWalksCompleted: number;
      totalMessages: number;
      avgCompatibilityScore: number | null;
      avgMatchRate: number | null;
    }[],
  ): Promise<void> {
    if (values.length === 0) return;

    await this.db
      .insert(experimentMetricsSnapshots)
      .values(values.map((v) => ({ ...v, createdAt: new Date() })))
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

  async getPredictionStatsForDay(dayStart: Date, nextDayStart: Date): Promise<PredictionStats> {
    const swipeFilter = sql`${swipeScoreLogs.createdAt} >= ${dayStart} AND ${swipeScoreLogs.createdAt} < ${nextDayStart}`;

    const [predictionStats] = await this.db
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

    return {
      totalPredictions: predictionStats?.totalPredictions ?? 0,
      avgOverallScore: predictionStats?.avgOverallScore ?? null,
    };
  }

  async getScoreBucketsForDay(dayStart: Date, nextDayStart: Date): Promise<ScoreBucket[]> {
    const swipeFilter = sql`${swipeScoreLogs.createdAt} >= ${dayStart} AND ${swipeScoreLogs.createdAt} < ${nextDayStart}`;

    const bucketRows = await this.db.execute<ScoreBucket>(sql`
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

    return bucketRows.rows;
  }

  async getWeightDistribution(): Promise<WeightDimension[]> {
    const weightRows = await this.db.execute<WeightDimension>(sql`
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

    return weightRows.rows;
  }

  async getSuccessRateDistribution(): Promise<{ bucket: string; count: number }[]> {
    const successRateRows = await this.db.execute<{ bucket: string; count: number }>(sql`
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

    return successRateRows.rows;
  }

  async upsertModelPerformance(value: {
    snapshotDate: Date;
    totalPredictions: number;
    totalMatches: number;
    avgOverallScore: number | null;
    scoreBuckets: Record<string, unknown>;
    weightDistribution: Record<string, unknown>;
    successRateDistribution: Record<string, unknown>;
  }): Promise<void> {
    await this.db
      .insert(modelPerformanceDaily)
      .values({
        ...value,
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
  }
}
