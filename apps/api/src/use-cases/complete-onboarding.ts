import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { UserRepository } from '../ports/user-repository.js';

interface Deps {
  userRepo: UserRepository;
}

export function createCompleteOnboarding({ userRepo }: Deps) {
  return async (userId: string): Promise<Result<{ message: string }>> => {
    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    if (user.onboardingCompletedAt) {
      return succeed({ message: 'Onboarding already completed' });
    }

    await userRepo.update(userId, { onboardingCompletedAt: new Date() });

    return succeed({ message: 'Onboarding completed' });
  };
}
