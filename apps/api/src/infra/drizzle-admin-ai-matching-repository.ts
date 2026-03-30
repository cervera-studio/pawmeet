import { experimentMetricsSnapshots, mlModelRegistry, modelPerformanceDaily } from '@pawmeet/db';
import { and, asc, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminAiMatchingRepository,
  ExperimentMetricsRow,
  MlModelRow,
  ModelPerformanceRow,
} from '../ports/admin-ai-matching-repository.js';

export class DrizzleAdminAiMatchingRepository implements AdminAiMatchingRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async getExperimentMetrics(
    experimentName: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<ExperimentMetricsRow[]> {
    const conditions = [eq(experimentMetricsSnapshots.experimentName, experimentName)];

    if (dateFrom) {
      conditions.push(gte(experimentMetricsSnapshots.snapshotDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(experimentMetricsSnapshots.snapshotDate, dateTo));
    }

    return this.db
      .select()
      .from(experimentMetricsSnapshots)
      .where(and(...conditions))
      .orderBy(asc(experimentMetricsSnapshots.snapshotDate));
  }

  async getModelPerformance(dateFrom?: Date, dateTo?: Date): Promise<ModelPerformanceRow[]> {
    const conditions: (SQL | undefined)[] = [];

    if (dateFrom) {
      conditions.push(gte(modelPerformanceDaily.snapshotDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(modelPerformanceDaily.snapshotDate, dateTo));
    }

    return this.db
      .select()
      .from(modelPerformanceDaily)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(modelPerformanceDaily.snapshotDate));
  }

  async listModels(): Promise<MlModelRow[]> {
    return this.db
      .select({
        id: mlModelRegistry.id,
        version: mlModelRegistry.version,
        r2Path: mlModelRegistry.r2Path,
        trainingSamplesCount: mlModelRegistry.trainingSamplesCount,
        metrics: mlModelRegistry.metrics,
        featureSchema: mlModelRegistry.featureSchema,
        hyperparameters: mlModelRegistry.hyperparameters,
        isActive: mlModelRegistry.isActive,
        promotedAt: mlModelRegistry.promotedAt,
        createdAt: mlModelRegistry.createdAt,
      })
      .from(mlModelRegistry)
      .orderBy(desc(mlModelRegistry.createdAt));
  }

  async deactivateAllModels(): Promise<void> {
    await this.db.update(mlModelRegistry).set({ isActive: false });
  }

  async promoteModel(version: string): Promise<void> {
    await this.db
      .update(mlModelRegistry)
      .set({ isActive: true, promotedAt: new Date() })
      .where(eq(mlModelRegistry.version, version));
  }
}
