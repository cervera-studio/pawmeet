import type { ApiClient } from '@dogwalk/api-client';
import type { AnalyticsKpis, DashboardStats, StatsRepository } from '../interfaces';

export function createTrpcStatsRepository(api: ApiClient): StatsRepository {
  return {
    async getStats(): Promise<DashboardStats> {
      return api.admin.getStats.query();
    },
    async getAnalyticsKpis(): Promise<AnalyticsKpis> {
      return api.admin.getAnalyticsKpis.query();
    },
  };
}
