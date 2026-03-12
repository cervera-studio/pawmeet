import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createUnfollowUser({ followRepo }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<{ unfollowed: boolean }>> => {
    if (userId === targetUserId) {
      return fail(new AppError('SELF_UNFOLLOW', 'Non puoi smettere di seguire te stesso', 400));
    }

    const removed = await followRepo.unfollow(userId, targetUserId);
    if (!removed) {
      return fail(new AppError('NOT_FOLLOWING', 'Non stai seguendo questo utente', 404));
    }

    return succeed({ unfollowed: true });
  };
}
