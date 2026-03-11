import type { FriendSummary } from '@dogwalk/types';
import { type Result, succeed } from '@dogwalk/types';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createListFriends({ followRepo }: Deps) {
  return async (
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Result<FriendSummary[]>> => {
    const friends = await followRepo.listFriends(userId, { limit, offset });
    return succeed(friends);
  };
}
