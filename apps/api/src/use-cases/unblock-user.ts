import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { FollowRepository } from '../ports/index.js';

type Deps = {
  followRepo: FollowRepository;
};

export function createUnblockUser({ followRepo }: Deps) {
  return async (userId: string, targetUserId: string): Promise<Result<{ unblocked: boolean }>> => {
    const removed = await followRepo.unblock(userId, targetUserId);
    if (!removed) {
      return fail(new AppError('NOT_BLOCKED', 'Utente non bloccato', 404));
    }

    return succeed({ unblocked: true });
  };
}
