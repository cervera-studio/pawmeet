import type { ApiClient } from '@dogwalk/api-client';
import type { DashboardStats, StatsRepository } from '../interfaces';

export function createTrpcStatsRepository(api: ApiClient): StatsRepository {
  return {
    async getStats(): Promise<DashboardStats> {
      return api.admin.getStats.query();
    },
  };
}
