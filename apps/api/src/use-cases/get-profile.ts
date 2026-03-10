import type { SafeUser } from '@dogwalk/types';
import { AppError, type Result, fail, succeed } from '@dogwalk/types';
import type { UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

export function createGetProfile({ userRepo }: Deps) {
  return async (userId: string): Promise<Result<{ user: SafeUser }>> => {
    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    const { passwordHash: _, ...safeUser } = user;
    return succeed({ user: safeUser });
  };
}
