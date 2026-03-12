import type { Result, WalkTrack } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { WalkTrackRepository } from '../ports/walk-track-repository.js';

type Deps = {
  walkTrackRepo: WalkTrackRepository;
};

export function createGetUserTracks({ walkTrackRepo }: Deps) {
  return async (
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<Result<{ tracks: WalkTrack[]; nextCursor: string | null }>> => {
    const page = await walkTrackRepo.findByUser(userId, cursor, limit);
    return succeed(page);
  };
}
