import type { ApiClient } from '@dogwalk/api-client';
import type { TrackPointInput, WalkTrackingRepository } from '../interfaces';

export function createTrpcWalkTrackingRepository(api: ApiClient): WalkTrackingRepository {
  return {
    async startTracking(walkId?) {
      return api.fitness.startTracking.mutate({ walkId });
    },
    async addPoints(trackId, points: TrackPointInput[]) {
      await api.fitness.addPoints.mutate({ trackId, points });
    },
    async endTracking(trackId) {
      return api.fitness.endTracking.mutate({ trackId });
    },
  };
}
