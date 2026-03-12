import { type Result, succeed } from '@pawmeet/types';
import type { FollowRepository, SearchResult, UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
  followRepo: FollowRepository;
};

export function createSearchUsers({ userRepo, followRepo }: Deps) {
  return async (
    userId: string,
    query: string,
    limit: number,
    offset: number,
  ): Promise<Result<SearchResult[]>> => {
    const results = await userRepo.searchByName(query, userId, limit, offset);

    // Filter out blocked users
    const filtered: SearchResult[] = [];
    for (const result of results) {
      const blocked = await followRepo.isBlockedEitherWay(userId, result.id);
      if (!blocked) {
        filtered.push(result);
      }
    }

    return succeed(filtered);
  };
}
