import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { StorageService, UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
  storage: StorageService;
};

export function createDeleteAvatar({ userRepo, storage }: Deps) {
  return async (userId: string): Promise<Result<{ message: string }>> => {
    const user = await userRepo.findById(userId);
    if (!user?.avatarUrl) {
      return fail(new AppError('NO_AVATAR', 'Nessun avatar da eliminare', 404));
    }

    // Delete from R2
    const key = storage.extractKeyFromUrl(user.avatarUrl);
    await storage.deleteObject(key);

    // Clear avatar URL in DB
    await userRepo.update(userId, { avatarUrl: null });

    return succeed({ message: 'Avatar eliminato' });
  };
}
