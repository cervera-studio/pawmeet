import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

export function createUpdatePreferences({ userRepo }: Deps) {
  return async (
    userId: string,
    searchRadiusKm: number,
  ): Promise<Result<{ searchRadiusKm: number }>> => {
    await userRepo.update(userId, { searchRadiusKm });

    return succeed({ searchRadiusKm });
  };
}
