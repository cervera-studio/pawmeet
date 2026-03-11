import type { Result, WalkTrack } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { WalkRepository } from '../ports/index.js';
import type { WalkTrackRepository } from '../ports/walk-track-repository.js';

type Deps = {
  walkTrackRepo: WalkTrackRepository;
  walkRepo?: WalkRepository;
};

export function createStartWalkTracking({ walkTrackRepo, walkRepo }: Deps) {
  return async (
    userId: string,
    input: { walkId: string | null },
  ): Promise<Result<{ track: WalkTrack }>> => {
    // If walkId is provided, validate it belongs to the user
    if (input.walkId && walkRepo) {
      const walk = await walkRepo.findById(input.walkId);
      if (!walk) {
        return fail(new AppError('WALK_NOT_FOUND', 'Passeggiata non trovata', 404));
      }
      if (walk.createdBy !== userId) {
        return fail(
          new AppError('WALK_NOT_OWNED', 'Non hai i permessi per questa passeggiata', 403),
        );
      }
    }

    const track = await walkTrackRepo.startTrack(userId, input.walkId ?? null);

    return succeed({ track });
  };
}
