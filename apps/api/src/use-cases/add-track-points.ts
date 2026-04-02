import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { WalkTrackRepository } from '../ports/walk-track-repository.js';

type Deps = {
  walkTrackRepo: WalkTrackRepository;
};

export function createAddTrackPoints({ walkTrackRepo }: Deps) {
  return async (
    userId: string,
    input: {
      trackId: string;
      points: Array<{
        latitude: number;
        longitude: number;
        altitude?: number | null;
        timestamp: string;
        speedKmh?: number | null;
      }>;
    },
  ): Promise<Result<{ added: number }>> => {
    const track = await walkTrackRepo.findById(input.trackId);

    if (!track) {
      return fail(new AppError('TRACK_NOT_FOUND', 'Walk track not found', 404));
    }

    if (track.userId !== userId) {
      return fail(new AppError('TRACK_NOT_OWNED', ERROR_MESSAGES.TRACK_NOT_OWNED, 403));
    }

    if (track.isCompleted) {
      return fail(
        new AppError('TRACK_ALREADY_COMPLETED', ERROR_MESSAGES.TRACK_ALREADY_COMPLETED, 400),
      );
    }

    // Get existing points to determine the next position
    const existingPoints = await walkTrackRepo.findPointsByTrack(input.trackId);
    const startPosition =
      existingPoints.length > 0 ? Math.max(...existingPoints.map((p) => p.position)) + 1 : 0;

    const pointsToInsert = input.points.map((p, i) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude ?? null,
      timestamp: new Date(p.timestamp),
      speedKmh: p.speedKmh ?? null,
      position: startPosition + i,
    }));

    await walkTrackRepo.addPoints(input.trackId, pointsToInsert);

    return succeed({ added: pointsToInsert.length });
  };
}
