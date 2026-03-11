import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildTrackPoint, buildWalkTrack, buildWalkTrackRepo } from '../test-utils/builders.js';
import { createAddTrackPoints } from './add-track-points.js';

describe('createAddTrackPoints', () => {
  const points = [
    { latitude: 41.9, longitude: 12.49, timestamp: '2026-03-10T08:01:00Z' },
    { latitude: 41.91, longitude: 12.5, timestamp: '2026-03-10T08:02:00Z' },
  ];

  it('adds points to an active track owned by the user', async () => {
    const track = buildWalkTrack({ userId: 'user-1', isCompleted: false });
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
      findPointsByTrack: vi.fn().mockResolvedValue([]),
      addPoints: vi.fn().mockResolvedValue(undefined),
    });

    const addTrackPoints = createAddTrackPoints({ walkTrackRepo });
    const result = await addTrackPoints('user-1', { trackId: 'track-1', points });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.added).toBe(2);
    expect(walkTrackRepo.addPoints).toHaveBeenCalledWith(
      'track-1',
      expect.arrayContaining([expect.objectContaining({ position: 0, latitude: 41.9 })]),
    );
  });

  it('continues position numbering from existing points', async () => {
    const track = buildWalkTrack({ userId: 'user-1', isCompleted: false });
    const existing = [buildTrackPoint({ position: 0 }), buildTrackPoint({ position: 1 })];
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
      findPointsByTrack: vi.fn().mockResolvedValue(existing),
      addPoints: vi.fn().mockResolvedValue(undefined),
    });

    const addTrackPoints = createAddTrackPoints({ walkTrackRepo });
    await addTrackPoints('user-1', { trackId: 'track-1', points });

    expect(walkTrackRepo.addPoints).toHaveBeenCalledWith(
      'track-1',
      expect.arrayContaining([expect.objectContaining({ position: 2 })]),
    );
  });

  it('fails when track is not found', async () => {
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(null),
    });

    const addTrackPoints = createAddTrackPoints({ walkTrackRepo });
    const result = await addTrackPoints('user-1', { trackId: 'track-1', points });

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_FOUND');
  });

  it('fails when track belongs to another user', async () => {
    const track = buildWalkTrack({ userId: 'user-2' });
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
    });

    const addTrackPoints = createAddTrackPoints({ walkTrackRepo });
    const result = await addTrackPoints('user-1', { trackId: 'track-1', points });

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_OWNED');
  });

  it('fails when track is already completed', async () => {
    const track = buildWalkTrack({ userId: 'user-1', isCompleted: true });
    const walkTrackRepo = buildWalkTrackRepo({
      findById: vi.fn().mockResolvedValue(track),
    });

    const addTrackPoints = createAddTrackPoints({ walkTrackRepo });
    const result = await addTrackPoints('user-1', { trackId: 'track-1', points });

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('TRACK_ALREADY_COMPLETED');
  });
});
