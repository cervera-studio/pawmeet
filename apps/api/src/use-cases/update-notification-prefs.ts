import type { NotificationPrefs, Result } from '@dogwalk/types';
import { AppError, DEFAULT_NOTIFICATION_PREFS, fail, succeed } from '@dogwalk/types';
import type { UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

export function createUpdateNotificationPrefs({ userRepo }: Deps) {
  return async (
    userId: string,
    prefs: Partial<NotificationPrefs>,
  ): Promise<Result<{ notificationPrefs: NotificationPrefs }>> => {
    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    // Merge with current prefs (or defaults if user has none yet)
    const current = user.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS;
    const merged: NotificationPrefs = { ...current, ...prefs };

    await userRepo.update(userId, { notificationPrefs: merged });

    return succeed({ notificationPrefs: merged });
  };
}
