import { logger } from '@pawmeet/utils';
import type { LocalCache, MatchRepository, NetworkState } from '../interfaces';

interface Deps {
  remote: MatchRepository;
  cache: LocalCache;
  network: NetworkState;
}

export function createCompositeMatchRepository(deps: Deps): MatchRepository {
  const { remote, cache, network } = deps;

  return {
    async discover(dogId, filters) {
      if (network.isOnline()) {
        try {
          const result = await remote.discover(dogId, filters);
          await cache.run(
            "INSERT OR REPLACE INTO cached_match_suggestions (dog_id, data, updated_at) VALUES (?, ?, datetime('now'))",
            [dogId, JSON.stringify(result.suggestions)],
          );
          return result;
        } catch (e) {
          logger.warn('CompositeMatch', 'Discover failed, using cache', e);
        }
      }

      const cached = await cache.getAll<{ data: string }>(
        'SELECT data FROM cached_match_suggestions WHERE dog_id = ?',
        [dogId],
      );
      if (cached[0]) {
        return { suggestions: JSON.parse(cached[0].data) };
      }
      return { suggestions: [] };
    },

    async like(dogId, targetDogId) {
      // Like requires server — can't be meaningfully queued (needs match response)
      if (!network.isOnline()) throw new Error('Swipe richiede connessione');
      return remote.like(dogId, targetDogId);
    },

    async pass(dogId, targetDogId) {
      if (!network.isOnline()) throw new Error('Swipe richiede connessione');
      await remote.pass(dogId, targetDogId);
    },
  };
}
