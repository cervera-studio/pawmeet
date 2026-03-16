export interface ExperimentMetricsRow {
  experimentName: string;
  variant: string;
  snapshotDate: Date;
  userCount: number;
  totalDiscoveries: number;
  totalLikes: number;
  totalMatches: number;
  totalWalksCompleted: number;
  totalMessages: number;
  avgCompatibilityScore: number | null;
  avgMatchRate: number | null;
  retainedD7: number | null;
}

export interface ModelPerformanceRow {
  snapshotDate: Date;
  totalPredictions: number;
  totalMatches: number;
  avgOverallScore: number | null;
  scoreBuckets: unknown;
  weightDistribution: unknown;
}

export interface MlModelRow {
  id: string;
  version: string;
  r2Path: string;
  trainingSamplesCount: number | null;
  metrics: unknown;
  featureSchema: unknown;
  hyperparameters: unknown;
  isActive: boolean;
  promotedAt: Date | null;
  createdAt: Date;
}

export interface AdminAiMatchingRepository {
  getExperimentMetrics(
    experimentName: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<ExperimentMetricsRow[]>;

  getModelPerformance(dateFrom?: Date, dateTo?: Date): Promise<ModelPerformanceRow[]>;

  listModels(): Promise<MlModelRow[]>;

  deactivateAllModels(): Promise<void>;

  promoteModel(version: string): Promise<void>;
}
