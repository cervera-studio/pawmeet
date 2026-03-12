import type { ApiClient } from '@pawmeet/api-client';
import type { BadgeRepository } from '../interfaces';

export function createTrpcBadgeRepository(api: ApiClient): BadgeRepository {
  return {
    async listByDog(dogId) {
      return api.badges.listByDog.query({ dogId });
    },
  };
}
