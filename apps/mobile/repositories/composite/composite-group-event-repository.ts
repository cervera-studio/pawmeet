import i18n from '@/lib/i18n';
import type {
  CreateGroupEventInput,
  FeaturedEvent,
  GroupEventRepository,
  LocalCache,
  NearbyEventsParams,
  NearbyEventWithStatus,
  NetworkState,
  SyncQueue,
} from '../interfaces';

interface Deps {
  remote: GroupEventRepository;
  cache: LocalCache;
  network: NetworkState;
  syncQueue: SyncQueue;
}

export function createCompositeGroupEventRepository(deps: Deps): GroupEventRepository {
  const { remote, cache, network, syncQueue } = deps;

  return {
    async listNearby(params: NearbyEventsParams): Promise<NearbyEventWithStatus[]> {
      if (network.isOnline()) {
        try {
          const result = await remote.listNearby(params);
          for (const event of result) {
            await cache.run(
              "INSERT OR REPLACE INTO cached_events (id, data, updated_at) VALUES (?, ?, datetime('now'))",
              [event.id, JSON.stringify(event)],
            );
          }
          return result;
        } catch {
          // Fall through to cache
        }
      }

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_events ORDER BY updated_at DESC LIMIT 50',
      );
      return cached.map((r) => JSON.parse(r.data) as NearbyEventWithStatus);
    },

    async listFeatured(page = 1, pageSize = 10): Promise<FeaturedEvent[]> {
      if (network.isOnline()) {
        try {
          return await remote.listFeatured(page, pageSize);
        } catch {
          // Fall through
        }
      }
      // Featured events are not cached separately — return empty when offline
      return [];
    },

    async getById(eventId) {
      if (network.isOnline()) return remote.getById(eventId);

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_events WHERE id = ?',
        [eventId],
      );
      if (cached[0]) return JSON.parse(cached[0].data);
      throw new Error(i18n.t('events.offlineErrors.unavailable'));
    },

    async create(input: CreateGroupEventInput) {
      if (!network.isOnline()) throw new Error(i18n.t('events.offlineErrors.createRequired'));
      return remote.create(input);
    },

    async join(eventId, dogId) {
      if (network.isOnline()) {
        await remote.join(eventId, dogId);
        return;
      }
      await syncQueue.enqueue({
        entityType: 'event_participant',
        operation: 'create',
        endpoint: 'groupEvents.join',
        payload: { eventId, dogId },
      });
    },

    async leave(eventId) {
      if (network.isOnline()) {
        await remote.leave(eventId);
        return;
      }
      await syncQueue.enqueue({
        entityType: 'event_participant',
        operation: 'delete',
        endpoint: 'groupEvents.leave',
        payload: { eventId },
      });
    },

    async cancel(eventId) {
      if (!network.isOnline()) throw new Error(i18n.t('events.offlineErrors.cancelRequired'));
      await remote.cancel(eventId);
    },

    async listPendingRequests(eventId) {
      if (!network.isOnline()) throw new Error(i18n.t('events.offlineErrors.requestsRequired'));
      return remote.listPendingRequests(eventId);
    },

    async approveParticipant(eventId, userId) {
      if (!network.isOnline()) throw new Error(i18n.t('events.offlineErrors.approveRequired'));
      await remote.approveParticipant(eventId, userId);
    },

    async declineParticipant(eventId, userId) {
      if (!network.isOnline()) throw new Error(i18n.t('events.offlineErrors.declineRequired'));
      await remote.declineParticipant(eventId, userId);
    },
  };
}
