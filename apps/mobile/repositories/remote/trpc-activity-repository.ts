import type { ApiClient } from '@pawmeet/api-client';
import type { ActivityRepository, StatsPeriod } from '../interfaces';

export function createTrpcActivityRepository(api: ApiClient): ActivityRepository {
  return {
    async getStats(period: StatsPeriod) {
      return api.fitness.getStats.query({ period });
    },
    async getDogGoal(dogId) {
      return api.fitness.getDogGoal.query({ dogId });
    },
  };
}
