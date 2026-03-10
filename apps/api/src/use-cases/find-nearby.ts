import { DEFAULT_SEARCH_RADIUS_KM } from '@dogwalk/config';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { NearbyUser, UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

type FindNearbyOpts = {
  radiusKm?: number;
  limit?: number;
  offset?: number;
};

export function createFindNearby({ userRepo }: Deps) {
  return async (
    userId: string,
    opts: FindNearbyOpts,
  ): Promise<Result<{ users: NearbyUser[]; radius: number; total: number }>> => {
    const user = await userRepo.findById(userId);
    if (!user?.latitude || !user?.longitude) {
      return fail(
        new AppError(
          'LOCATION_NOT_SET',
          'Posizione non impostata. Aggiorna la tua posizione.',
          400,
        ),
      );
    }

    const effectiveRadius = opts.radiusKm ?? user.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;
    const effectiveLimit = opts.limit ?? 20;
    const effectiveOffset = opts.offset ?? 0;

    const users = await userRepo.findNearby({
      userId,
      latitude: user.latitude,
      longitude: user.longitude,
      radiusKm: effectiveRadius,
      limit: effectiveLimit,
      offset: effectiveOffset,
    });

    return succeed({ users, radius: effectiveRadius, total: users.length });
  };
}
