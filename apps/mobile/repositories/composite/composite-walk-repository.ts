import { logger } from '@pawmeet/utils';
import type {
  LocalCache,
  NetworkState,
  ProposeWalkInput,
  SyncQueue,
  WalkRepository,
} from '../interfaces';

interface Deps {
  remote: WalkRepository;
  cache: LocalCache;
  network: NetworkState;
  syncQueue: SyncQueue;
}

export function createCompositeWalkRepository(deps: Deps): WalkRepository {
  const { remote, cache, network, syncQueue } = deps;

  return {
    async listUpcoming() {
      if (network.isOnline()) {
        try {
          const result = await remote.listUpcoming();
          for (const walk of result.walks) {
            await cache.run(
              "INSERT OR REPLACE INTO cached_walks (id, data, updated_at) VALUES (?, ?, datetime('now'))",
              [walk.id, JSON.stringify(walk)],
            );
          }
          return result;
        } catch {
          // Fall through
        }
      }

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_walks ORDER BY updated_at DESC',
      );
      return { walks: cached.map((r) => JSON.parse(r.data)) };
    },

    async propose(input: ProposeWalkInput) {
      if (!network.isOnline()) throw new Error('Proposta passeggiata richiede connessione');
      return remote.propose(input);
    },

    async respond(walkId, accept) {
      if (network.isOnline()) {
        await remote.respond(walkId, accept);
        return;
      }
      await syncQueue.enqueue({
        entityType: 'walk',
        operation: 'update',
        endpoint: 'walks.respond',
        payload: { walkId, accept },
      });
    },

    async cancel(walkId) {
      if (network.isOnline()) {
        await remote.cancel(walkId);
        return;
      }
      await syncQueue.enqueue({
        entityType: 'walk',
        operation: 'update',
        endpoint: 'walks.cancel',
        payload: { walkId },
      });
    },

    async listByMatch(matchId) {
      if (network.isOnline()) return remote.listByMatch(matchId);

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_walks ORDER BY updated_at DESC',
      );
      const all = cached.map((r) => JSON.parse(r.data));
      return { walks: all.filter((w: { matchId?: string }) => w.matchId === matchId) };
    },
  };
}
