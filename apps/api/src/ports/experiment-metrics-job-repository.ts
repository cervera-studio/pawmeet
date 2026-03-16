export interface VariantMetrics {
  [key: string]: unknown;
  variant: string;
  userCount: number;
  totalDiscoveries: number;
  totalLikes: number;
  totalMatches: number;
  totalWalksCompleted: number;
  totalMessages: number;
  avgCompatibilityScore: number | null;
}

export interface PredictionStats {
  totalPredictions: number;
  avgOverallScore: number | null;
}

export interface ScoreBucket {
  [key: string]: unknown;
  bucket: string;
  swipes: number;
  likes: number;
  matches: number;
  observedMatchRate: number;
}

export interface WeightDimension {
  [key: string]: unknown;
  dimension: string;
  avgWeight: number;
  stdDev: number;
}

export interface ExperimentMetricsJobRepository {
  getVariantMetricsForDay(
    tsFilter: { dayStart: Date; nextDayStart: Date },
    experimentName: string,
  ): Promise<VariantMetrics[]>;
  upsertExperimentSnapshots(
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
  ): Promise<void>;
  getPredictionStatsForDay(dayStart: Date, nextDayStart: Date): Promise<PredictionStats>;
  getScoreBucketsForDay(dayStart: Date, nextDayStart: Date): Promise<ScoreBucket[]>;
  getWeightDistribution(): Promise<WeightDimension[]>;
  getSuccessRateDistribution(): Promise<{ bucket: string; count: number }[]>;
  upsertModelPerformance(value: {
    snapshotDate: Date;
    totalPredictions: number;
    totalMatches: number;
    avgOverallScore: number | null;
    scoreBuckets: Record<string, unknown>;
    weightDistribution: Record<string, unknown>;
    successRateDistribution: Record<string, unknown>;
  }): Promise<void>;
}
