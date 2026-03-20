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
    async listFeatured(page = 1, pageSize = 10) {
      return api.groupEvents.listFeatured.query({ page, pageSize });
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
    async listPendingRequests(eventId) {
      return api.groupEvents.listPendingRequests.query({ eventId });
    },
    async approveParticipant(eventId, userId) {
      await api.groupEvents.approveParticipant.mutate({ eventId, userId });
    },
    async declineParticipant(eventId, userId) {
      await api.groupEvents.declineParticipant.mutate({ eventId, userId });
    },
  };
}
