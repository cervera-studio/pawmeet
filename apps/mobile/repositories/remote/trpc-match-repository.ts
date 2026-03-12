import type { ApiClient } from '@pawmeet/api-client';
import type { DiscoveryFilters } from '@pawmeet/types';
import type { MatchRepository } from '../interfaces';

export function createTrpcMatchRepository(api: ApiClient): MatchRepository {
  return {
    async discover(dogId, filters?: DiscoveryFilters) {
      return api.matches.discover.query({ dogId, filters });
    },
    async like(dogId, targetDogId) {
      return api.matches.like.mutate({ dogId, targetDogId });
    },
    async pass(dogId, targetDogId) {
      await api.matches.pass.mutate({ dogId, targetDogId });
    },
  };
}
