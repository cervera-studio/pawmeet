import type { PrivacyPrefs, Result } from '@pawmeet/types';
import { AppError, DEFAULT_PRIVACY_PREFS, fail, succeed } from '@pawmeet/types';
import type { UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

export function createUpdatePrivacyPrefs({ userRepo }: Deps) {
  return async (
    userId: string,
    prefs: Partial<PrivacyPrefs>,
  ): Promise<Result<{ privacyPrefs: PrivacyPrefs }>> => {
    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    const current = user.privacyPrefs ?? DEFAULT_PRIVACY_PREFS;
    const merged: PrivacyPrefs = { ...current, ...prefs };

    await userRepo.update(userId, { privacyPrefs: merged });

    return succeed({ privacyPrefs: merged });
  };
}
