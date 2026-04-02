import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createUnfollowUser({ followRepo }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<{ unfollowed: boolean }>> => {
    if (userId === targetUserId) {
      return fail(new AppError('SELF_UNFOLLOW', ERROR_MESSAGES.SELF_UNFOLLOW, 400));
    }

    const removed = await followRepo.unfollow(userId, targetUserId);
    if (!removed) {
      return fail(new AppError('NOT_FOLLOWING', ERROR_MESSAGES.NOT_FOLLOWING, 404));
    }

    return succeed({ unfollowed: true });
  };
}
