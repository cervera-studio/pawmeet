import { type Result, succeed } from '@pawmeet/types';
import type { FollowRepository } from '../ports/follow-repository.js';

type Deps = {
  followRepo: FollowRepository;
};

type FollowStatus = {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isFriend: boolean;
  isBlocked: boolean;
};

export function createGetFollowStatus({ followRepo }: Deps) {
  return async (currentUserId: string, targetUserId: string): Promise<Result<FollowStatus>> => {
    const [isFollowing, isFollowedBy, isBlocked] = await Promise.all([
      followRepo.isFollowing(currentUserId, targetUserId),
      followRepo.isFollowing(targetUserId, currentUserId),
      followRepo.isBlockedEitherWay(currentUserId, targetUserId),
    ]);

    return succeed({
      isFollowing,
      isFollowedBy,
      isFriend: isFollowing && isFollowedBy,
      isBlocked,
    });
  };
}
