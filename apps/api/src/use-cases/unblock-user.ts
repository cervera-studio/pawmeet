import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createUnblockUser({ followRepo }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<{ unblocked: boolean }>> => {
    const removed = await followRepo.unblock(userId, targetUserId);
    if (!removed) {
      return fail(new AppError('NOT_BLOCKED', ERROR_MESSAGES.NOT_BLOCKED, 404));
    }

    logger.info('UnblockUser', 'User unblocked', { userId, targetUserId });

    return succeed({ unblocked: true });
  };
}
