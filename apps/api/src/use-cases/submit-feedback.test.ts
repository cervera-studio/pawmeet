import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildFeedbackRepo,
  buildMatch,
  buildMatchRepo,
  buildWalk,
  buildWalkRepo,
} from '../test-utils/builders.js';
import { createSubmitFeedback } from './submit-feedback.js';

describe('submitFeedback', () => {
  const defaultInput = {
    walkId: 'walk-1',
    toDogId: 'dog-2',
    rating: 4,
    comment: 'Great walk!',
  };

  it('creates feedback for a completed walk', async () => {
    const feedbackRepo = buildFeedbackRepo();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(buildWalk({ status: 'completed' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(buildMatch()) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const submitFeedback = createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo });

    const result = await submitFeedback('user-1', defaultInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('feedback-1');
    expect(feedbackRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        walkId: 'walk-1',
        fromUserId: 'user-1',
        toDogId: 'dog-2',
        rating: 4,
      }),
    );
  });

  it('fails when walk is not found', async () => {
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(null) });
    const feedbackRepo = buildFeedbackRepo();
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const submitFeedback = createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo });

    const result = await submitFeedback('user-1', defaultInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_FOUND');
  });

  it('fails when walk is not completed', async () => {
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(buildWalk({ status: 'pending' })),
    });
    const feedbackRepo = buildFeedbackRepo();
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const submitFeedback = createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo });

    const result = await submitFeedback('user-1', defaultInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_COMPLETED');
  });

  it('fails when user is not a participant in the walk', async () => {
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-other' })]),
    });
    const feedbackRepo = buildFeedbackRepo();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(buildWalk({ status: 'completed' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(buildMatch()) });
    const submitFeedback = createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo });

    const result = await submitFeedback('user-1', defaultInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FEEDBACK_NOT_PARTICIPANT');
  });

  it('fails when user already submitted feedback for this walk', async () => {
    const feedbackRepo = buildFeedbackRepo({
      hasSubmitted: vi.fn().mockResolvedValue(true),
    });
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(buildWalk({ status: 'completed' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(buildMatch()) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const submitFeedback = createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo });

    const result = await submitFeedback('user-1', defaultInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FEEDBACK_ALREADY_SUBMITTED');
  });

  it('fails when user tries to rate their own dog', async () => {
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const feedbackRepo = buildFeedbackRepo();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(buildWalk({ status: 'completed' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(buildMatch()) });
    const submitFeedback = createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo });

    // user-1 owns dog-1, and tries to rate dog-1
    const result = await submitFeedback('user-1', {
      walkId: 'walk-1',
      toDogId: 'dog-1',
      rating: 5,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FEEDBACK_OWN_DOG');
  });

  it('fails when target dog is not part of the match', async () => {
    const feedbackRepo = buildFeedbackRepo();
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(buildWalk({ status: 'completed' })),
    });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(buildMatch()) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const submitFeedback = createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo });

    const result = await submitFeedback('user-1', {
      walkId: 'walk-1',
      toDogId: 'dog-not-in-match',
      rating: 3,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FEEDBACK_INVALID_DOG');
  });
});
