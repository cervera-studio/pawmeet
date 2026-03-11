import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildWalkTrack, buildWalkTrackRepo } from '../test-utils/builders.js';
import { createStartWalkTracking } from './start-walk-tracking.js';

describe('createStartWalkTracking', () => {
  it('creates a track successfully without walkId', async () => {
    const track = buildWalkTrack();
    const walkTrackRepo = buildWalkTrackRepo({
      startTrack: vi.fn().mockResolvedValue(track),
    });
    const startWalkTracking = createStartWalkTracking({ walkTrackRepo });

    const result = await startWalkTracking('user-1', { walkId: null });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.track).toEqual(track);
    expect(walkTrackRepo.startTrack).toHaveBeenCalledWith('user-1', null);
  });

  it('creates a track successfully with walkId', async () => {
    const track = buildWalkTrack({ walkId: 'walk-1' });
    const walkTrackRepo = buildWalkTrackRepo({
      startTrack: vi.fn().mockResolvedValue(track),
    });
    const walkRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue({ id: 'walk-1', createdBy: 'user-1' }),
      findByMatchId: vi.fn(),
      findUpcoming: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
      countCompletedForDog: vi.fn(),
      getAverageRatingForDog: vi.fn(),
    };
    const startWalkTracking = createStartWalkTracking({ walkTrackRepo, walkRepo });

    const result = await startWalkTracking('user-1', { walkId: 'walk-1' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.track.walkId).toBe('walk-1');
    expect(walkTrackRepo.startTrack).toHaveBeenCalledWith('user-1', 'walk-1');
  });
});
