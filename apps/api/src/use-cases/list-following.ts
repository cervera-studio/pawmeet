import type { FollowSummary } from '@dogwalk/types';
import { type Result, succeed } from '@dogwalk/types';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createListFollowing({ followRepo }: Deps) {
  return async (
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Result<FollowSummary[]>> => {
    const following = await followRepo.listFollowing(userId, { limit, offset });
    return succeed(following);
  };
}
