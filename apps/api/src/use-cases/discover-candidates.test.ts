import { COMPATIBILITY_THRESHOLD } from '@dogwalk/config';
import type { DogProfile, User } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type {
  CandidateDog,
  DogRepository,
  MatchRepository,
  UserRepository,
} from '../ports/index.js';
import { createDiscoverCandidates } from './discover-candidates.js';

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
    walkPrefTime: ['mattina', 'pomeriggio'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    passwordHash: '$2b$12$hash',
    authProvider: 'email',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    locationUpdatedAt: new Date('2026-03-01'),
    searchRadiusKm: 50,
    emailVerified: true,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<CandidateDog> = {}): CandidateDog {
  return {
    dog: buildDog({
      id: 'dog-2',
      ownerId: 'user-2',
      name: 'Bella',
      size: 'grande',
      energyLevel: 'alta',
      behaviorWithDogs: 'socievole',
      leashBehavior: 'buono',
      walkPrefTime: ['mattina', 'pomeriggio'],
      walkPrefDurationMin: 30,
      walkPrefDurationMax: 60,
      walkPrefTerrain: ['parco', 'urbano'],
    }),
    ownerLat: 41.91,
    ownerLon: 12.5,
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

function buildMatchRepo(overrides: Partial<MatchRepository> = {}): MatchRepository {
  return {
    findActiveByDogIds: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    softDelete: vi.fn(),
    findSwipedDogIds: vi.fn().mockResolvedValue([]),
    countDailySwipes: vi.fn(),
    findSwipe: vi.fn(),
    findReciprocalLike: vi.fn(),
    createSwipe: vi.fn(),
    findCandidateDogs: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findNearby: vi.fn(),
    ...overrides,
  };
}

describe('discoverCandidates', () => {
  it('returns scored and sorted suggestions', async () => {
    const myDog = buildDog();
    const candidate = buildCandidate();
    const user = buildUser();

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([candidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({ dogRepo, matchRepo, userRepo });
    const result = await discover('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.length).toBeGreaterThanOrEqual(1);
    const suggestion = result.data.suggestions[0];
    expect(suggestion.dog.id).toBe('dog-2');
    expect(suggestion.compatibilityScore).toBeGreaterThanOrEqual(COMPATIBILITY_THRESHOLD);
    expect(suggestion.distanceKm).toBeGreaterThan(0);
  });

  it('filters out candidates below compatibility threshold', async () => {
    // Create a very incompatible dog
    const incompatibleCandidate = buildCandidate({
      dog: buildDog({
        id: 'dog-3',
        ownerId: 'user-3',
        size: 'toy',
        energyLevel: 'bassa',
        behaviorWithDogs: 'reattivo',
        leashBehavior: 'difficile',
        walkPrefTime: ['sera_tardi'],
        walkPrefDurationMin: 10,
        walkPrefDurationMax: 15,
        walkPrefTerrain: ['spiaggia'],
      }),
    });

    const myDog = buildDog();
    const user = buildUser();

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([incompatibleCandidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({ dogRepo, matchRepo, userRepo });
    const result = await discover('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    // All returned suggestions must be above threshold
    for (const s of result.data.suggestions) {
      expect(s.compatibilityScore).toBeGreaterThanOrEqual(COMPATIBILITY_THRESHOLD);
    }
  });

  it('excludes already-swiped dogs', async () => {
    const candidate = buildCandidate();
    const myDog = buildDog();
    const user = buildUser();

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findSwipedDogIds: vi.fn().mockResolvedValue(['dog-2']),
      findCandidateDogs: vi.fn().mockResolvedValue([candidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({ dogRepo, matchRepo, userRepo });
    const result = await discover('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.every((s) => s.dog.id !== 'dog-2')).toBe(true);
  });

  it('fails with DOG_NOT_FOUND when dog not owned by user', async () => {
    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(null) });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo();

    const discover = createDiscoverCandidates({ dogRepo, matchRepo, userRepo });
    const result = await discover('user-1', 'dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails with LOCATION_NOT_SET when user has no location', async () => {
    const myDog = buildDog();
    const user = buildUser({ latitude: null, longitude: null });

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({ dogRepo, matchRepo, userRepo });
    const result = await discover('user-1', 'dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('LOCATION_NOT_SET');
    expect(result.error.status).toBe(400);
  });
});
