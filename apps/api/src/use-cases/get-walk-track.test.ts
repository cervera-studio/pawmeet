import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildTrackPoint, buildWalkTrack, buildWalkTrackRepo } from '../test-utils/builders.js';
import { createGetWalkTrack } from './get-walk-track.js';

describe('createGetWalkTrack', () => {
  it('returns track with its points when owned by user', async () => {
    const track = buildWalkTrack({ userId: 'user-1' });
    const points = [buildTrackPoint({ position: 0 }), buildTrackPoint({ position: 1 })];
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
      findPointsByTrack: vi.fn().mockResolvedValue(points),
    });

    const getWalkTrack = createGetWalkTrack({ walkTrackRepo });
    const result = await getWalkTrack('user-1', { trackId: 'track-1' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.track).toEqual(track);
    expect(result.data.points).toHaveLength(2);
  });

  it('fails when track is not found', async () => {
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(null),
    });

    const getWalkTrack = createGetWalkTrack({ walkTrackRepo });
    const result = await getWalkTrack('user-1', { trackId: 'track-1' });

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_FOUND');
  });

  it('fails when track belongs to another user', async () => {
    const track = buildWalkTrack({ userId: 'user-2' });
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
    });

    const getWalkTrack = createGetWalkTrack({ walkTrackRepo });
    const result = await getWalkTrack('user-1', { trackId: 'track-1' });

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_OWNED');
  });
});
