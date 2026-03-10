import type { DogProfile, Match, Walk, WalkFeedback } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type {
  DogRepository,
  FeedbackRepository,
  MatchRepository,
  WalkRepository,
} from '../ports/index.js';
import { createSubmitFeedback } from './submit-feedback.js';

function buildWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: 'walk-1',
    matchId: 'match-1',
    createdBy: 'user-1',
    title: null,
    scheduledAt: new Date('2026-06-15T10:00:00Z'),
    durationMin: 30,
    location: null,
    latitude: null,
    longitude: null,
    status: 'completed',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    dogAId: 'dog-1',
    dogBId: 'dog-2',
    compatibilityScore: 0.75,
    createdAt: new Date(),
    isActive: true,
    ...overrides,
  };
}

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'user-1',
    name: 'Rex',
    birthDate: new Date('2022-01-01'),
    breed: 'Labrador',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'affidabile',
    bio: null,
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildFeedback(overrides: Partial<WalkFeedback> = {}): WalkFeedback {
  return {
    id: 'feedback-1',
    walkId: 'walk-1',
    fromUserId: 'user-1',
    toDogId: 'dog-2',
    rating: 4 as 1 | 2 | 3 | 4 | 5,
    comment: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildFeedbackRepo(overrides: Partial<FeedbackRepository> = {}): FeedbackRepository {
  return {
    create: vi.fn().mockResolvedValue(buildFeedback()),
    findByWalk: vi.fn().mockResolvedValue([]),
    findByDog: vi.fn().mockResolvedValue([]),
    getAverageRating: vi.fn().mockResolvedValue({ average: null, count: 0 }),
    hasSubmitted: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function buildWalkRepo(overrides: Partial<WalkRepository> = {}): WalkRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildWalk()),
    findByMatchId: vi.fn(),
    findUpcoming: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    countCompletedForDog: vi.fn(),
    getAverageRatingForDog: vi.fn(),
    ...overrides,
  };
}

function buildMatchRepo(overrides: Partial<MatchRepository> = {}): MatchRepository {
  return {
    findActiveByDogIds: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildMatch()),
    create: vi.fn(),
    softDelete: vi.fn(),
    findSwipedDogIds: vi.fn(),
    countDailySwipes: vi.fn(),
    findSwipe: vi.fn(),
    findReciprocalLike: vi.fn(),
    createSwipe: vi.fn(),
    findCandidateDogs: vi.fn(),
    ...overrides,
  };
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    findByIdAndOwner: vi.fn(),
    countByOwner: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findPhotos: vi.fn(),
    countPhotos: vi.fn(),
    addPhoto: vi.fn(),
    findPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    updatePhotoPositions: vi.fn(),
    ...overrides,
  };
}

describe('submitFeedback', () => {
  const defaultInput = {
    walkId: 'walk-1',
    toDogId: 'dog-2',
    rating: 4,
    comment: 'Great walk!',
  };

  it('creates feedback for a completed walk', async () => {
    const feedbackRepo = buildFeedbackRepo();
    const walkRepo = buildWalkRepo();
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
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
    const walkRepo = buildWalkRepo();
    const matchRepo = buildMatchRepo();
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
    const walkRepo = buildWalkRepo();
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
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
    const walkRepo = buildWalkRepo();
    const matchRepo = buildMatchRepo();
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
    const walkRepo = buildWalkRepo();
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
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
