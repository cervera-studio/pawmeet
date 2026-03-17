import { logger } from '@pawmeet/utils';
import type { BadgeRepository, LocalCache, NetworkState } from '../interfaces';

interface Deps {
  remote: BadgeRepository;
  cache: LocalCache;
  network: NetworkState;
}

export function createCompositeBadgeRepository(deps: Deps): BadgeRepository {
  const { remote, cache, network } = deps;

  return {
    async listByDog(dogId) {
      if (network.isOnline()) {
        try {
          const result = await remote.listByDog(dogId);
          for (const badge of result.badges) {
            await cache.run(
              "INSERT OR REPLACE INTO cached_badges (id, dog_id, data, updated_at) VALUES (?, ?, ?, datetime('now'))",
              [badge.id, dogId, JSON.stringify(badge)],
            );
          }
          return result;
        } catch (e) {
          logger.warn('CompositeBadge', 'Remote fetch failed, using cache', e);
        }
      }

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_badges WHERE dog_id = ? ORDER BY updated_at DESC',
        [dogId],
      );
      return { badges: cached.map((r) => JSON.parse(r.data)) };
    },
  };
}
