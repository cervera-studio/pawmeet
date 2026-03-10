import { SWIPE_DAILY_LIMIT } from '@dogwalk/config';
import type { DogProfile, Match, Swipe, User } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository, MatchRepository, UserRepository } from '../ports/index.js';
import { createLikeDog } from './like-dog.js';

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

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    dogAId: 'dog-1',
    dogBId: 'dog-2',
    compatibilityScore: 0,
    createdAt: new Date(),
    isActive: true,
    ...overrides,
  };
}

function buildSwipe(overrides: Partial<Swipe> = {}): Swipe {
  return {
    id: 'swipe-1',
    swiperDogId: 'dog-2',
    swipedDogId: 'dog-1',
    direction: 'like',
    createdAt: new Date(),
    ...overrides,
  };
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByOwner: vi.fn(),
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

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-2',
    email: 'owner@example.com',
    displayName: 'Dog Owner',
    passwordHash: 'hash',
    authProvider: 'email',
    avatarUrl: null,
    latitude: null,
    longitude: null,
    locationUpdatedAt: null,
    searchRadiusKm: 10,
    emailVerified: true,
    pushToken: null,
    notificationPrefs: { matches: true, messages: true, reminders: true },
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildUser()),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findNearby: vi.fn(),
    updatePushToken: vi.fn(),
    findPushToken: vi.fn(),
    ...overrides,
  };
}

function buildMatchRepo(overrides: Partial<MatchRepository> = {}): MatchRepository {
  return {
    findActiveByDogIds: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    softDelete: vi.fn(),
    findSwipedDogIds: vi.fn(),
    countDailySwipes: vi.fn().mockResolvedValue(0),
    findSwipe: vi.fn().mockResolvedValue(null),
    findReciprocalLike: vi.fn().mockResolvedValue(null),
    createSwipe: vi.fn().mockResolvedValue({} as Swipe),
    findCandidateDogs: vi.fn(),
    ...overrides,
  };
}

describe('likeDog', () => {
  it('records a like and returns isMatch false when no reciprocal', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isMatch).toBe(false);
    expect(result.data.match).toBeUndefined();
    expect(matchRepo.createSwipe).toHaveBeenCalledWith({
      swiperDogId: 'dog-1',
      swipedDogId: 'dog-2',
      direction: 'like',
    });
  });

  it('creates a match when there is a reciprocal like', async () => {
    const match = buildMatch();
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo({
      findReciprocalLike: vi.fn().mockResolvedValue(buildSwipe()),
      create: vi.fn().mockResolvedValue(match),
    });
    const userRepo = buildUserRepo();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isMatch).toBe(true);
    expect(result.data.match).toEqual(match);
    expect(matchRepo.create).toHaveBeenCalledWith({
      dogAId: 'dog-1',
      dogBId: 'dog-2',
      compatibilityScore: 0,
    });
  });

  it('fails with DOG_NOT_FOUND when user does not own the dog', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(null),
    });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with SWIPE_LIMIT_REACHED when daily limit exceeded', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo({
      countDailySwipes: vi.fn().mockResolvedValue(SWIPE_DAILY_LIMIT),
    });
    const userRepo = buildUserRepo();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('SWIPE_LIMIT_REACHED');
    expect(result.error.status).toBe(429);
  });

  it('fails with ALREADY_SWIPED when swipe already exists', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const matchRepo = buildMatchRepo({
      findSwipe: vi.fn().mockResolvedValue(buildSwipe()),
    });
    const userRepo = buildUserRepo();
    const likeDog = createLikeDog({ dogRepo, matchRepo, userRepo });

    const result = await likeDog('user-1', 'dog-1', 'dog-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_SWIPED');
    expect(result.error.status).toBe(409);
  });
});
