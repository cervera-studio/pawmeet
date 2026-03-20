import type { XpAction } from '@pawmeet/config';
import type { Result, WalkTrack, XpSummary } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { calculateDistance } from '@pawmeet/utils';
import { assertOwnership } from '../domain/ownership.js';
import type { WalkTrackRepository } from '../ports/walk-track-repository.js';

type AwardXpFn = (
  userId: string,
  action: XpAction,
  metadata?: Record<string, unknown>,
) => Promise<Result<{ xpAwarded: number; summary: XpSummary }>>;

type Deps = {
  walkTrackRepo: WalkTrackRepository;
  awardXp?: AwardXpFn;
};

export function createEndWalkTracking({ walkTrackRepo, awardXp }: Deps) {
  return async (
    userId: string,
    input: { trackId: string },
  ): Promise<Result<{ track: WalkTrack }>> => {
    const track = await walkTrackRepo.findById(input.trackId);

    if (!track) {
      return fail(new AppError('TRACK_NOT_FOUND', 'Walk track not found', 404));
    }

    assertOwnership(
      track.userId,
      userId,
      'TRACK_NOT_OWNED',
      'Non hai i permessi per questo tracciamento',
    );

    if (track.isCompleted) {
      return fail(new AppError('TRACK_ALREADY_COMPLETED', 'Il tracciamento è già completato', 400));
    }

    // Compute summary from recorded points
    const points = await walkTrackRepo.findPointsByTrack(input.trackId);

    let distanceKm = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (prev && curr) {
        distanceKm += calculateDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude,
        );
      }
    }

    const firstPoint = points[0];
    const lastPoint = points.at(-1);
    let durationMinutes = 0;

    if (firstPoint && lastPoint) {
      const startTime = new Date(firstPoint.timestamp).getTime();
      const endTime = new Date(lastPoint.timestamp).getTime();
      durationMinutes = Math.round((endTime - startTime) / 60_000);
    }

    const avgSpeedKmh = durationMinutes > 0 ? (distanceKm / durationMinutes) * 60 : 0;

    const summary = {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes,
      avgSpeedKmh: Math.round(avgSpeedKmh * 100) / 100,
    };

    const updatedTrack = await walkTrackRepo.endTrack(input.trackId, summary);

    if (!updatedTrack) {
      return fail(new AppError('TRACK_NOT_FOUND', 'Walk track not found', 404));
    }

    if (awardXp) {
      await awardXp(userId, 'walk_tracked', { trackId: updatedTrack.id });
    }

    return succeed({ track: updatedTrack });
  };
}
