import type { UserBlock } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { FollowRepository, UserRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
  userRepo: UserRepository;
};

export function createBlockUser({ followRepo, userRepo }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<UserBlock>> => {
    if (userId === targetUserId) {
      return fail(new AppError('SELF_BLOCK', 'Non puoi bloccare te stesso', 400));
    }

    const target = await userRepo.findById(targetUserId);
    if (!target) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    const alreadyBlocked = await followRepo.isBlocked(userId, targetUserId);
    if (alreadyBlocked) {
      return fail(new AppError('ALREADY_BLOCKED', 'Utente già bloccato', 409));
    }

    // block() also removes mutual follows
    const block = await followRepo.block(userId, targetUserId);

    logger.info('BlockUser', 'User blocked', { userId, targetUserId });

    return succeed(block);
  };
}
