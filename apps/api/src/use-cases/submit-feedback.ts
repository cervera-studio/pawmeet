import type { WalkFeedback } from '@pawmeet/types';
import { AppError, fail, type Result, succeed, WALK_STATUS } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { sanitizeContent } from '../lib/sanitize.js';
import type {
  DogRepository,
  FeedbackRepository,
  MatchRepository,
  WalkRepository,
} from '../ports/index.js';

type Deps = {
  feedbackRepo: FeedbackRepository;
  walkRepo: WalkRepository;
  matchRepo: MatchRepository;
  dogRepo: DogRepository;
};

type SubmitFeedbackInput = {
  walkId: string;
  toDogId: string;
  rating: number;
  comment?: string;
};

export function createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo }: Deps) {
  return async (userId: string, input: SubmitFeedbackInput): Promise<Result<WalkFeedback>> => {
    // Validate walk exists and is completed
    const walk = await walkRepo.findById(input.walkId);
    if (!walk) {
      return fail(new AppError('WALK_NOT_FOUND', 'Walk not found', 404));
    }

    if (walk.status !== WALK_STATUS.COMPLETED) {
      return fail(new AppError('WALK_NOT_COMPLETED', ERROR_MESSAGES.WALK_NOT_COMPLETED, 400));
    }

    // Verify user participated in this walk via match
    const match = await matchRepo.findById(walk.matchId);
    if (!match) {
      return fail(new AppError('MATCH_NOT_FOUND', 'Match not found', 404));
    }

    const userDogs = await dogRepo.findByOwner(userId, true);
    const dogIds = new Set(userDogs.map((d) => d.id));
    const isParticipant = dogIds.has(match.dogAId) || dogIds.has(match.dogBId);

    if (!isParticipant) {
      return fail(
        new AppError('FEEDBACK_NOT_PARTICIPANT', ERROR_MESSAGES.FEEDBACK_NOT_PARTICIPANT, 403),
      );
    }

    // Verify the target dog is the other dog in the match (not the user's own dog)
    const targetDogInMatch = input.toDogId === match.dogAId || input.toDogId === match.dogBId;
    if (!targetDogInMatch) {
      return fail(new AppError('FEEDBACK_INVALID_DOG', ERROR_MESSAGES.FEEDBACK_INVALID_DOG, 400));
    }

    // Ensure user is not rating their own dog
    if (dogIds.has(input.toDogId)) {
      return fail(new AppError('FEEDBACK_OWN_DOG', ERROR_MESSAGES.FEEDBACK_OWN_DOG, 400));
    }

    // Check if user already submitted feedback for this walk
    const alreadySubmitted = await feedbackRepo.hasSubmitted(input.walkId, userId);
    if (alreadySubmitted) {
      return fail(
        new AppError(
          'FEEDBACK_ALREADY_SUBMITTED',
          'Hai già lasciato un feedback per questa passeggiata',
          409,
        ),
      );
    }

    const feedback = await feedbackRepo.create({
      walkId: input.walkId,
      fromUserId: userId,
      toDogId: input.toDogId,
      rating: input.rating as 1 | 2 | 3 | 4 | 5,
      comment: input.comment ? sanitizeContent(input.comment) : null,
    });

    return succeed(feedback);
  };
}
