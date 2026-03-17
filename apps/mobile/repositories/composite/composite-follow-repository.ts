import { logger } from '@pawmeet/utils';
import type { FollowRepository, LocalCache, NetworkState, SyncQueue } from '../interfaces';

interface Deps {
  remote: FollowRepository;
  cache: LocalCache;
  network: NetworkState;
  syncQueue: SyncQueue;
}

export function createCompositeFollowRepository(deps: Deps): FollowRepository {
  const { remote, cache, network, syncQueue } = deps;

  return {
    async follow(userId) {
      if (network.isOnline()) return remote.follow(userId);
      await syncQueue.enqueue({
        entityType: 'follow',
        operation: 'create',
        endpoint: 'follows.follow',
        payload: { userId },
      });
      return { success: true };
    },

    async unfollow(userId) {
      if (network.isOnline()) return remote.unfollow(userId);
      await syncQueue.enqueue({
        entityType: 'follow',
        operation: 'delete',
        endpoint: 'follows.unfollow',
        payload: { userId },
      });
      return { success: true };
    },

    async listFollowers(userId, cursor, limit) {
      if (network.isOnline()) {
        const result = await remote.listFollowers(userId, cursor, limit);
        await cache.run(
          "INSERT OR REPLACE INTO cached_follows (key, data, updated_at) VALUES (?, ?, datetime('now'))",
          [`followers:${userId}`, JSON.stringify(result)],
        );
        return result;
      }

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_follows WHERE key = ?',
        [`followers:${userId}`],
      );
      if (cached[0]) return JSON.parse(cached[0].data);
      return { users: [], nextCursor: null };
    },

    async listFollowing(userId, cursor, limit) {
      if (network.isOnline()) {
        const result = await remote.listFollowing(userId, cursor, limit);
        await cache.run(
          "INSERT OR REPLACE INTO cached_follows (key, data, updated_at) VALUES (?, ?, datetime('now'))",
          [`following:${userId}`, JSON.stringify(result)],
        );
        return result;
      }

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_follows WHERE key = ?',
        [`following:${userId}`],
      );
      if (cached[0]) return JSON.parse(cached[0].data);
      return { users: [], nextCursor: null };
    },

    async listFriends(cursor, limit) {
      if (network.isOnline()) {
        const result = await remote.listFriends(cursor, limit);
        await cache.run(
          "INSERT OR REPLACE INTO cached_follows (key, data, updated_at) VALUES (?, ?, datetime('now'))",
          ['friends', JSON.stringify(result)],
        );
        return result;
      }

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_follows WHERE key = ?',
        ['friends'],
      );
      if (cached[0]) return JSON.parse(cached[0].data);
      return { users: [], nextCursor: null };
    },

    async getFollowStatus(userId) {
      if (!network.isOnline()) {
        return { isFollowing: false, isFollowedByMe: false, isFollowingMe: false };
      }
      return remote.getFollowStatus(userId);
    },

    async searchUsers(query, limit) {
      if (!network.isOnline()) return [];
      return remote.searchUsers(query, limit);
    },

    async block(userId) {
      if (!network.isOnline()) throw new Error('Blocco utente richiede connessione');
      return remote.block(userId);
    },

    async unblock(userId) {
      if (!network.isOnline()) throw new Error('Sblocco utente richiede connessione');
      return remote.unblock(userId);
    },

    async listBlocked(cursor, limit) {
      if (!network.isOnline()) return { users: [], nextCursor: null };
      return remote.listBlocked(cursor, limit);
    },
  };
}
