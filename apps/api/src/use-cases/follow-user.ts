import type { UserFollow } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { FollowRepository, NotificationService, UserRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
  userRepo: UserRepository;
  notificationService: NotificationService;
};

export function createFollowUser({ followRepo, userRepo, notificationService }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<UserFollow>> => {
    if (userId === targetUserId) {
      return fail(new AppError('SELF_FOLLOW', 'Non puoi seguire te stesso', 400));
    }

    const target = await userRepo.findById(targetUserId);
    if (!target?.isActive) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    const blocked = await followRepo.isBlockedEitherWay(userId, targetUserId);
    if (blocked) {
      return fail(new AppError('USER_BLOCKED', 'Operazione non consentita', 403));
    }

    const alreadyFollowing = await followRepo.isFollowing(userId, targetUserId);
    if (alreadyFollowing) {
      return fail(new AppError('ALREADY_FOLLOWING', 'Stai già seguendo questo utente', 409));
    }

    const follow = await followRepo.follow(userId, targetUserId);

    // Notify target about new follower (fire-and-forget)
    const follower = await userRepo.findById(userId);
    if (follower) {
      notificationService
        .send({
          userId: targetUserId,
          title: 'Nuovo follower!',
          body: `${follower.displayName} ha iniziato a seguirti`,
          data: { type: 'new_follower', userId },
        })
        .catch((err) => logger.error('followUser', 'Failed to send follower notification', err));
    }

    return succeed(follow);
  };
}
