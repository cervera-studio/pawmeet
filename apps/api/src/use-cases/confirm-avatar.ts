import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { StorageService, UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
  storage: StorageService;
};

export function createConfirmAvatar({ userRepo, storage }: Deps) {
  return async (userId: string, key: string): Promise<Result<{ avatarUrl: string }>> => {
    if (!key.startsWith(`avatars/${userId}/`)) {
      return fail(new AppError('INVALID_KEY', 'Chiave non valida', 403));
    }

    // Delete old avatar from R2 if present
    const user = await userRepo.findById(userId);
    if (user?.avatarUrl) {
      const oldKey = storage.extractKeyFromUrl(user.avatarUrl);
      try {
        await storage.deleteObject(oldKey);
      } catch (e) {
        logger.warn('ConfirmAvatar', 'Failed to delete old avatar from storage', e);
      }
    }

    // Update user record with new avatar URL
    const publicUrl = storage.getPublicUrl(key);
    await userRepo.update(userId, { avatarUrl: publicUrl });

    return succeed({ avatarUrl: publicUrl });
  };
}
