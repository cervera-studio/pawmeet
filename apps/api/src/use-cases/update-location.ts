import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

export function createUpdateLocation({ userRepo }: Deps) {
  return async (
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<Result<{ latitude: number; longitude: number; updatedAt: string }>> => {
    const now = new Date();
    await userRepo.update(userId, { latitude, longitude, locationUpdatedAt: now });

    return succeed({ latitude, longitude, updatedAt: now.toISOString() });
  };
}
