import type { UserBlock } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { FollowRepository, UserRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
  userRepo: UserRepository;
};

export function createBlockUser({ followRepo, userRepo }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<UserBlock>> => {
    if (userId === targetUserId) {
      return fail(new AppError('SELF_BLOCK', ERROR_MESSAGES.SELF_BLOCK, 400));
    }

    const target = await userRepo.findById(targetUserId);
    if (!target) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    const alreadyBlocked = await followRepo.isBlocked(userId, targetUserId);
    if (alreadyBlocked) {
      return fail(new AppError('ALREADY_BLOCKED', ERROR_MESSAGES.ALREADY_BLOCKED, 409));
    }

    // block() also removes mutual follows
    const block = await followRepo.block(userId, targetUserId);

    logger.info('BlockUser', 'User blocked', { userId, targetUserId });

    return succeed(block);
  };
}
