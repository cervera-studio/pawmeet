import type { LeaderboardType } from '@pawmeet/config';
import type { LeaderboardEntry, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { GamificationRepository } from '../ports/gamification-repository.js';

type Deps = {
  gamificationRepo: GamificationRepository;
};

/** Get ranked leaderboard (weekly or all-time). */
export function createGetLeaderboard({ gamificationRepo }: Deps) {
  return async (
    type: LeaderboardType,
    limit: number,
  ): Promise<Result<{ entries: LeaderboardEntry[] }>> => {
    const entries = await gamificationRepo.getLeaderboard(type, limit);
    return succeed({ entries });
  };
}
