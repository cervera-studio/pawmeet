import type { ApiClient } from '@pawmeet/api-client';
import type { ActivityRepository, StatsPeriod } from '../interfaces';

export function createTrpcActivityRepository(api: ApiClient): ActivityRepository {
  return {
    async getStats(period: StatsPeriod) {
      const result = await api.fitness.getStats.query({ period });
      return result as Awaited<ReturnType<ActivityRepository['getStats']>>;
    },
    async getDogGoal(dogId) {
      const result = await api.fitness.getDogGoal.query({ dogId });
      return result as Awaited<ReturnType<ActivityRepository['getDogGoal']>>;
    },
  };
}
