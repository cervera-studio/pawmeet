import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { calculateDistance } from '@pawmeet/utils';
import { safeParseCoordinates } from '@pawmeet/validation';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { hasLocation } from '../domain/type-guards.js';
import type { UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

/** Maximum realistic speed in km/h (covers high-speed trains) */
const MAX_SPEED_KMH = 500;

export interface UpdateLocationResult {
  latitude: number;
  longitude: number;
  updatedAt: string;
  forced?: boolean;
  distanceKm?: number;
  speedKmh?: number;
  elapsedHours?: number;
}

export function createUpdateLocation({ userRepo }: Deps) {
  return async (
    userId: string,
    latitude: number,
    longitude: number,
    force?: boolean,
  ): Promise<Result<UpdateLocationResult>> => {
    // Validate coordinate bounds using value object
    const coordsResult = safeParseCoordinates(latitude, longitude);
    if (!coordsResult.success) {
      return fail(new AppError('INVALID_COORDINATES', 'Invalid coordinates', 400));
    }

    // Check for unrealistic movement speed
    const user = await userRepo.findById(userId);
    if (user && hasLocation(user) && user.locationUpdatedAt) {
      const elapsedHours =
        (Date.now() - new Date(user.locationUpdatedAt).getTime()) / (1000 * 60 * 60);
      if (elapsedHours > 0) {
        const distanceKm = calculateDistance(user.latitude, user.longitude, latitude, longitude);
        const speedKmh = distanceKm / elapsedHours;
        if (speedKmh > MAX_SPEED_KMH) {
          if (!force) {
            return fail(
              new AppError('SUSPICIOUS_LOCATION', ERROR_MESSAGES.SUSPICIOUS_LOCATION, 409, {
                distanceKm: Math.round(distanceKm),
              }),
            );
          }
          // force=true: accept the update and return metadata for analytics
          const now = new Date();
          await userRepo.update(userId, { latitude, longitude, locationUpdatedAt: now });
          return succeed({
            latitude,
            longitude,
            updatedAt: now.toISOString(),
            forced: true,
            distanceKm: Math.round(distanceKm),
            speedKmh: Math.round(speedKmh),
            elapsedHours: Math.round(elapsedHours * 100) / 100,
          });
        }
      }
    }

    const now = new Date();
    await userRepo.update(userId, { latitude, longitude, locationUpdatedAt: now });

    return succeed({ latitude, longitude, updatedAt: now.toISOString() });
  };
}
