import type { UserBlock } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
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
    return succeed(block);
  };
}
