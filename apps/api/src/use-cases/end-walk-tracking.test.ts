import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildTrackPoint, buildWalkTrack, buildWalkTrackRepo } from '../test-utils/builders.js';
import { createEndWalkTracking } from './end-walk-tracking.js';

describe('createEndWalkTracking', () => {
  it('ends tracking and computes distance from points', async () => {
    const track = buildWalkTrack();
    const completedTrack = buildWalkTrack({
      isCompleted: true,
      distanceKm: 1.0,
      durationMinutes: 30,
      avgSpeedKmh: 2.0,
    });

    // Two points roughly 111m apart (0.001 degrees latitude at equator)
    const points = [
      buildTrackPoint({
        id: 'p-1',
        position: 0,
        latitude: 41.9028,
        longitude: 12.4964,
        timestamp: new Date('2026-03-10T08:00:00Z'),
      }),
      buildTrackPoint({
        id: 'p-2',
        position: 1,
        latitude: 41.9038,
        longitude: 12.4964,
        timestamp: new Date('2026-03-10T08:30:00Z'),
      }),
    ];

    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
      findPointsByTrack: vi.fn().mockResolvedValue(points),
      endTrack: vi.fn().mockResolvedValue(completedTrack),
    });

    const endWalkTracking = createEndWalkTracking({ walkTrackRepo });
    const result = await endWalkTracking('user-1', { trackId: 'track-1' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.track.isCompleted).toBe(true);
    expect(walkTrackRepo.endTrack).toHaveBeenCalledWith('track-1', {
      distanceKm: expect.any(Number),
      durationMinutes: 30,
      avgSpeedKmh: expect.any(Number),
    });
  });

  it('fails when track is not found', async () => {
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(null),
    });

    const endWalkTracking = createEndWalkTracking({ walkTrackRepo });
    const result = await endWalkTracking('user-1', { trackId: 'track-999' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_FOUND');
  });

  it('fails when track is already completed', async () => {
    const track = buildWalkTrack({ isCompleted: true });
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
    });

    const endWalkTracking = createEndWalkTracking({ walkTrackRepo });
    const result = await endWalkTracking('user-1', { trackId: 'track-1' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TRACK_ALREADY_COMPLETED');
  });
});
