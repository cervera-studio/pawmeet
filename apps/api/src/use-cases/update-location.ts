import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { UserRepository } from '../ports/index.js';

type Deps = {
  userRepo: UserRepository;
};

/** Maximum realistic speed in km/h (covers high-speed trains) */
const MAX_SPEED_KMH = 500;

/** Haversine distance between two coordinates in km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function createUpdateLocation({ userRepo }: Deps) {
  return async (
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<Result<{ latitude: number; longitude: number; updatedAt: string }>> => {
    // Validate coordinate bounds
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return fail(new AppError('INVALID_COORDINATES', 'Coordinate non valide', 400));
    }

    // Check for unrealistic movement speed
    const user = await userRepo.findById(userId);
    if (user?.latitude != null && user.longitude != null && user.locationUpdatedAt) {
      const elapsedHours =
        (Date.now() - new Date(user.locationUpdatedAt).getTime()) / (1000 * 60 * 60);
      if (elapsedHours > 0) {
        const distanceKm = haversineKm(user.latitude, user.longitude, latitude, longitude);
        const speedKmh = distanceKm / elapsedHours;
        if (speedKmh > MAX_SPEED_KMH) {
          return fail(new AppError('SUSPICIOUS_LOCATION', 'Aggiornamento posizione sospetto', 400));
        }
      }
    }

    const now = new Date();
    await userRepo.update(userId, { latitude, longitude, locationUpdatedAt: now });

    return succeed({ latitude, longitude, updatedAt: now.toISOString() });
  };
}
