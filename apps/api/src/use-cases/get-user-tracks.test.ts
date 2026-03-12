import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildWalkTrack, buildWalkTrackRepo } from '../test-utils/builders.js';
import { createGetUserTracks } from './get-user-tracks.js';

describe('createGetUserTracks', () => {
  it('returns paginated tracks for the user', async () => {
    const tracks = [buildWalkTrack(), buildWalkTrack({ id: 'track-2' })];
    const walkTrackRepo = buildWalkTrackRepo({
      findByUser: vi.fn().mockResolvedValue({ tracks, nextCursor: 'cursor-2' }),
    });

    const getUserTracks = createGetUserTracks({ walkTrackRepo });
    const result = await getUserTracks('user-1', null, 10);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.tracks).toHaveLength(2);
    expect(result.data.nextCursor).toBe('cursor-2');
    expect(walkTrackRepo.findByUser).toHaveBeenCalledWith('user-1', null, 10);
  });

  it('returns empty list when user has no tracks', async () => {
    const walkTrackRepo = buildWalkTrackRepo({
      findByUser: vi.fn().mockResolvedValue({ tracks: [], nextCursor: null }),
    });

    const getUserTracks = createGetUserTracks({ walkTrackRepo });
    const result = await getUserTracks('user-1', null, 10);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.tracks).toHaveLength(0);
    expect(result.data.nextCursor).toBeNull();
  });
});
