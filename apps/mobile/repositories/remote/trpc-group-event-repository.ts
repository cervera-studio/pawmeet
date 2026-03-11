import type { ApiClient } from '@dogwalk/api-client';
import type {
  CreateGroupEventInput,
  GroupEventRepository,
  NearbyEventsParams,
} from '../interfaces';

export function createTrpcGroupEventRepository(api: ApiClient): GroupEventRepository {
  return {
    async listNearby(params: NearbyEventsParams) {
      const result = await api.groupEvents.listNearby.query(params);
      return result as Awaited<ReturnType<GroupEventRepository['listNearby']>>;
    },
    async getById(eventId) {
      const result = await api.groupEvents.get.query({ eventId });
      return result as Awaited<ReturnType<GroupEventRepository['getById']>>;
    },
    async create(input: CreateGroupEventInput) {
      const result = await api.groupEvents.create.mutate(input);
      return result as Awaited<ReturnType<GroupEventRepository['create']>>;
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
