import type { ApiClient } from '@pawmeet/api-client';
import type {
  CreateGroupEventInput,
  GroupEventRepository,
  NearbyEventsParams,
} from '../interfaces';

export function createTrpcGroupEventRepository(api: ApiClient): GroupEventRepository {
  return {
    async listNearby(params: NearbyEventsParams) {
      return api.groupEvents.listNearby.query(params);
    },
    async getById(eventId) {
      return api.groupEvents.get.query({ eventId });
    },
    async create(input: CreateGroupEventInput) {
      return api.groupEvents.create.mutate(input);
    },
    async join(eventId, dogId) {
      await api.groupEvents.join.mutate({ eventId, dogId });
    },
    async leave(eventId) {
      await api.groupEvents.leave.mutate({ eventId });
    },
    async cancel(eventId) {
      await api.groupEvents.cancel.mutate({ eventId });
    },
  };
}
