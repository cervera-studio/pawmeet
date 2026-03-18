import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildMoodLog,
  buildMoodLogRepo,
  buildWalkTrack,
  buildWalkTrackRepo,
} from '../test-utils/builders.js';
import { createSubmitMoodLog } from './submit-mood-log.js';

describe('createSubmitMoodLog', () => {
  const dog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
  const completedTrack = buildWalkTrack({
    id: 'track-1',
    userId: 'user-1',
    isCompleted: true,
  });

  it('creates mood log for completed track', async () => {
    const deps = {
      moodLogRepo: buildMoodLogRepo(),
      walkTrackRepo: buildWalkTrackRepo({
        findById: vi.fn().mockResolvedValue(completedTrack),
      }),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      }),
    };

    const submitMoodLog = createSubmitMoodLog(deps);
    const result = await submitMoodLog('user-1', {
      dogId: 'dog-1',
      trackId: 'track-1',
      rating: 4,
      tags: ['calm', 'socialization_ok'],
      notes: 'Great walk!',
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.rating).toBe(4);
    expect(result.data.tags).toEqual(['calm', 'socialization_ok']);
  });

  it('fails DOG_NOT_FOUND if dog not owned', async () => {
    const deps = {
      moodLogRepo: buildMoodLogRepo(),
      walkTrackRepo: buildWalkTrackRepo(),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(null),
      }),
    };

    const submitMoodLog = createSubmitMoodLog(deps);
    const result = await submitMoodLog('user-1', {
      dogId: 'dog-x',
      trackId: 'track-1',
      rating: 3,
      tags: [],
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails TRACK_NOT_FOUND if track missing', async () => {
    const deps = {
      moodLogRepo: buildMoodLogRepo(),
      walkTrackRepo: buildWalkTrackRepo({
        findById: vi.fn().mockResolvedValue(null),
      }),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      }),
    };

    const submitMoodLog = createSubmitMoodLog(deps);
    const result = await submitMoodLog('user-1', {
      dogId: 'dog-1',
      trackId: 'track-x',
      rating: 3,
      tags: [],
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_FOUND');
  });

  it('fails TRACK_NOT_COMPLETED if track still in progress', async () => {
    const deps = {
      moodLogRepo: buildMoodLogRepo(),
      walkTrackRepo: buildWalkTrackRepo({
        findById: vi
          .fn()
          .mockResolvedValue(buildWalkTrack({ isCompleted: false, userId: 'user-1' })),
      }),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      }),
    };

    const submitMoodLog = createSubmitMoodLog(deps);
    const result = await submitMoodLog('user-1', {
      dogId: 'dog-1',
      trackId: 'track-1',
      rating: 3,
      tags: [],
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_COMPLETED');
  });

  it('fails MOOD_LOG_ALREADY_SUBMITTED if duplicate', async () => {
    const deps = {
      moodLogRepo: buildMoodLogRepo({
        findByTrack: vi.fn().mockResolvedValue(buildMoodLog()),
      }),
      walkTrackRepo: buildWalkTrackRepo({
        findById: vi.fn().mockResolvedValue(completedTrack),
      }),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      }),
    };

    const submitMoodLog = createSubmitMoodLog(deps);
    const result = await submitMoodLog('user-1', {
      dogId: 'dog-1',
      trackId: 'track-1',
      rating: 5,
      tags: [],
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MOOD_LOG_ALREADY_SUBMITTED');
  });

  it('fails TRACK_NOT_OWNED if track belongs to another user', async () => {
    const deps = {
      moodLogRepo: buildMoodLogRepo(),
      walkTrackRepo: buildWalkTrackRepo({
        findById: vi
          .fn()
          .mockResolvedValue(buildWalkTrack({ userId: 'user-other', isCompleted: true })),
      }),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      }),
    };

    const submitMoodLog = createSubmitMoodLog(deps);
    const result = await submitMoodLog('user-1', {
      dogId: 'dog-1',
      trackId: 'track-1',
      rating: 3,
      tags: [],
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TRACK_NOT_OWNED');
  });
});
