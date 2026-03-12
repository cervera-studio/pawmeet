import type { ApiClient } from '@pawmeet/api-client';
import type { SmartMatchingRepository, SwipeScores } from '../interfaces';

export function createTrpcSmartMatchingRepository(api: ApiClient): SmartMatchingRepository {
  return {
    async getInsights(dogId) {
      return api.matchingAi.insights.query({ dogId });
    },
    async getOptimalTimes(dogId) {
      return api.matchingAi.optimalTimes.query({ dogId });
    },
    async recordActivity(dayOfWeek, hourOfDay) {
      await api.matchingAi.recordActivity.mutate({ dayOfWeek, hourOfDay });
    },
    async logSwipeScores(dogId, targetDogId, direction, scores: SwipeScores) {
      await api.matchingAi.logSwipeScores.mutate({ dogId, targetDogId, direction, scores });
    },
    async learnPreferences() {
      await api.matchingAi.learnPreferences.mutate();
    },
  };
}
