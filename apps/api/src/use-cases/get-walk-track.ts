import type { Result, WalkTrack, WalkTrackPoint } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { WalkTrackRepository } from '../ports/walk-track-repository.js';

type Deps = {
  walkTrackRepo: WalkTrackRepository;
};

export function createGetWalkTrack({ walkTrackRepo }: Deps) {
  return async (
    userId: string,
    input: { trackId: string },
  ): Promise<Result<{ track: WalkTrack; points: WalkTrackPoint[] }>> => {
    const track = await walkTrackRepo.findById(input.trackId);

    if (!track) {
      return fail(new AppError('TRACK_NOT_FOUND', 'Walk track not found', 404));
    }

    if (track.userId !== userId) {
      return fail(
        new AppError('TRACK_NOT_OWNED', 'Non hai i permessi per questo tracciamento', 403),
      );
    }

    const points = await walkTrackRepo.findPointsByTrack(input.trackId);

    return succeed({ track, points });
  };
}
