import { logger } from '@pawmeet/utils';
import type { GamificationRepository, LocalCache, NetworkState } from '../interfaces';

interface Deps {
  remote: GamificationRepository;
  cache: LocalCache;
  network: NetworkState;
}

export function createCompositeGamificationRepository(deps: Deps): GamificationRepository {
  const { remote, cache, network } = deps;

  async function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T | null> {
    if (network.isOnline()) {
      try {
        const result = await fetcher();
        await cache.run(
          "INSERT OR REPLACE INTO cached_gamification (key, data, updated_at) VALUES (?, ?, datetime('now'))",
          [key, JSON.stringify(result)],
        );
        return result;
      } catch (e) {
        logger.warn('CompositeGamification', `Remote fetch failed for ${key}`, e);
      }
    }

    const cached = await cache.getAll<{ data: string }>(
      'SELECT data FROM cached_gamification WHERE key = ?',
      [key],
    );
    if (cached[0]) return JSON.parse(cached[0].data) as T;
    return null;
  }

  return {
    async getXpSummary() {
      const result = await getCachedOrFetch('xp_summary', () => remote.getXpSummary());
      return result ?? { totalXp: 0, level: '1', xpToNextLevel: null };
    },

    async getLeaderboard(type, limit) {
      const result = await getCachedOrFetch(`leaderboard:${type}`, () =>
        remote.getLeaderboard(type, limit),
      );
      return result ?? [];
    },

    async listActiveChallenges() {
      const result = await getCachedOrFetch('challenges', () => remote.listActiveChallenges());
      return result ?? [];
    },

    async listAchievements() {
      const result = await getCachedOrFetch('achievements', () => remote.listAchievements());
      return result ?? [];
    },
  };
}
