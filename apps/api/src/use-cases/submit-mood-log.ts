import type { MoodLog, MoodTag } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { DogRepository, MoodLogRepository, WalkTrackRepository } from '../ports/index.js';

type Deps = {
  moodLogRepo: MoodLogRepository;
  walkTrackRepo: WalkTrackRepository;
  dogRepo: DogRepository;
};

type SubmitMoodLogInput = {
  dogId: string;
  trackId: string;
  rating: number;
  tags: MoodTag[];
  notes?: string;
};

export function createSubmitMoodLog({ moodLogRepo, walkTrackRepo, dogRepo }: Deps) {
  return async (userId: string, input: SubmitMoodLogInput): Promise<Result<MoodLog>> => {
    // Verify dog ownership
    const dog = await dogRepo.findByIdAndOwner(input.dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    // Verify track exists and belongs to user
    const track = await walkTrackRepo.findById(input.trackId);
    if (!track) {
      return fail(new AppError('TRACK_NOT_FOUND', 'Walk track not found', 404));
    }

    if (track.userId !== userId) {
      return fail(new AppError('TRACK_NOT_OWNED', 'Walk track not authorized', 403));
    }

    // Verify track is completed
    if (!track.isCompleted) {
      return fail(new AppError('TRACK_NOT_COMPLETED', ERROR_MESSAGES.TRACK_NOT_COMPLETED, 400));
    }

    // Check if already submitted for this dog+track
    const existing = await moodLogRepo.findByTrack(input.trackId, input.dogId);
    if (existing) {
      return fail(
        new AppError('MOOD_LOG_ALREADY_SUBMITTED', ERROR_MESSAGES.MOOD_LOG_ALREADY_SUBMITTED, 409),
      );
    }

    const moodLog = await moodLogRepo.create({
      dogId: input.dogId,
      trackId: input.trackId,
      userId,
      rating: input.rating as 1 | 2 | 3 | 4 | 5,
      tags: input.tags,
      notes: input.notes ?? null,
    });

    return succeed(moodLog);
  };
}
