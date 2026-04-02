import type { UserFollow } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { NOTIF_NEW_FOLLOWER } from '../constants/notifications.js';
import type { FollowRepository, NotificationService, UserRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
  userRepo: UserRepository;
  notificationService: NotificationService;
};

export function createFollowUser({ followRepo, userRepo, notificationService }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<UserFollow>> => {
    if (userId === targetUserId) {
      return fail(new AppError('SELF_FOLLOW', ERROR_MESSAGES.SELF_FOLLOW, 400));
    }

    const target = await userRepo.findById(targetUserId);
    if (!target?.isActive) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    const blocked = await followRepo.isBlockedEitherWay(userId, targetUserId);
    if (blocked) {
      return fail(new AppError('USER_BLOCKED', ERROR_MESSAGES.OPERATION_NOT_ALLOWED, 403));
    }

    const alreadyFollowing = await followRepo.isFollowing(userId, targetUserId);
    if (alreadyFollowing) {
      return fail(new AppError('ALREADY_FOLLOWING', ERROR_MESSAGES.ALREADY_FOLLOWING, 409));
    }

    const follow = await followRepo.follow(userId, targetUserId);

    // Notify target about new follower (fire-and-forget)
    const follower = await userRepo.findById(userId);
    if (follower) {
      notificationService
        .send({
          userId: targetUserId,
          title: NOTIF_NEW_FOLLOWER.title,
          body: NOTIF_NEW_FOLLOWER.body(follower.displayName),
          data: { type: 'new_follower', userId },
        })
        .catch((err) => logger.error('followUser', 'Failed to send follower notification', err));
    }

    return succeed(follow);
  };
}
