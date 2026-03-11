import type { FollowSummary } from '@dogwalk/types';
import { type Result, succeed } from '@dogwalk/types';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createListFollowers({ followRepo }: Deps) {
  return async (
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Result<FollowSummary[]>> => {
    const followers = await followRepo.listFollowers(userId, { limit, offset });
    return succeed(followers);
  };
}
