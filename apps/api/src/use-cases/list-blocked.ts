import type { FollowSummary } from '@pawmeet/types';
import { type Result, succeed } from '@pawmeet/types';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createListBlocked({ followRepo }: Deps) {
  return async (
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Result<FollowSummary[]>> => {
    const blocked = await followRepo.listBlocked(userId, { limit, offset });
    return succeed(blocked);
  };
}
