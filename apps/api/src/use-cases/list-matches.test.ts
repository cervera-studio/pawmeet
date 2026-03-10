import type { DogProfile, Match, User } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository, MatchRepository, UserRepository } from '../ports/index.js';
import { createListMatches } from './list-matches.js';

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
    compatibilityScore: 0.85,
    createdAt: new Date('2026-03-01'),
    isActive: true,
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-2',
    email: 'other@example.com',
    displayName: 'Altro Utente',
    passwordHash: '$2b$12$hash',
    authProvider: 'email',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    locationUpdatedAt: new Date('2026-03-01'),
    searchRadiusKm: 50,
    emailVerified: true,
    pushToken: null,
    notificationPrefs: { matches: true, messages: true, reminders: true },
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn(),
    findByIds: vi.fn().mockResolvedValue([]),
    findByOwner: vi.fn().mockResolvedValue([]),
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
    findActiveByDogIds: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
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

function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    findNearby: vi.fn(),
    updatePushToken: vi.fn(),
    findPushToken: vi.fn(),
    ...overrides,
  };
}

describe('listMatches', () => {
  it('returns empty matches when user has no dogs', async () => {
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([]) });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo();
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toEqual([]);
  });

  it('returns empty matches when there are no active matches', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([myDog]) });
    const matchRepo = buildMatchRepo({ findActiveByDogIds: vi.fn().mockResolvedValue([]) });
    const userRepo = buildUserRepo();
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toEqual([]);
  });

  it('returns enriched matches with other dog and owner info', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1', name: 'Rex' });
    const otherDog = buildDog({ id: 'dog-2', ownerId: 'user-2', name: 'Bella', breed: 'Beagle' });
    const otherOwner = buildUser({ id: 'user-2', displayName: 'Altro Utente' });
    const match = buildMatch({ id: 'match-1', dogAId: 'dog-1', dogBId: 'dog-2' });

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: vi.fn().mockResolvedValue([myDog, otherDog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match]),
    });
    const userRepo = buildUserRepo({
      findByIds: vi.fn().mockResolvedValue([otherOwner]),
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toHaveLength(1);
    const enriched = result.data.matches[0];
    expect(enriched.id).toBe('match-1');
    expect(enriched.compatibilityScore).toBe(0.85);
    expect(enriched.otherDog).toEqual({ id: 'dog-2', name: 'Bella', breed: 'Beagle' });
    expect(enriched.otherOwner).toEqual({ id: 'user-2', displayName: 'Altro Utente' });
  });

  it('uses fallback values when dog or owner not found', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const match = buildMatch({ id: 'match-1', dogAId: 'dog-1', dogBId: 'dog-missing' });

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: vi.fn().mockResolvedValue([myDog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match]),
    });
    const userRepo = buildUserRepo({
      findByIds: vi.fn().mockResolvedValue([]),
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const enriched = result.data.matches[0];
    expect(enriched.otherDog).toEqual({ id: 'dog-missing', name: 'Sconosciuto', breed: '' });
    expect(enriched.otherOwner).toEqual({ id: '', displayName: 'Utente' });
  });

  it('correctly identifies the other dog when user dog is dogB', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const otherDog = buildDog({
      id: 'dog-3',
      ownerId: 'user-3',
      name: 'Luna',
      breed: 'Pastore Tedesco',
    });
    const otherOwner = buildUser({ id: 'user-3', displayName: 'Marco' });
    const match = buildMatch({ id: 'match-2', dogAId: 'dog-3', dogBId: 'dog-1' });

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: vi.fn().mockResolvedValue([myDog, otherDog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match]),
    });
    const userRepo = buildUserRepo({
      findByIds: vi.fn().mockResolvedValue([otherOwner]),
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const enriched = result.data.matches[0];
    expect(enriched.otherDog).toEqual({ id: 'dog-3', name: 'Luna', breed: 'Pastore Tedesco' });
    expect(enriched.otherOwner).toEqual({ id: 'user-3', displayName: 'Marco' });
  });

  it('batch-fetches dogs and owners efficiently', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const otherDog1 = buildDog({ id: 'dog-2', ownerId: 'user-2', name: 'Bella', breed: 'Beagle' });
    const otherDog2 = buildDog({ id: 'dog-3', ownerId: 'user-3', name: 'Luna', breed: 'Husky' });
    const owner2 = buildUser({ id: 'user-2', displayName: 'Anna' });
    const owner3 = buildUser({ id: 'user-3', displayName: 'Marco' });

    const match1 = buildMatch({ id: 'match-1', dogAId: 'dog-1', dogBId: 'dog-2' });
    const match2 = buildMatch({ id: 'match-2', dogAId: 'dog-1', dogBId: 'dog-3' });

    const findByIdsDog = vi.fn().mockResolvedValue([myDog, otherDog1, otherDog2]);
    const findByIdsUser = vi.fn().mockResolvedValue([owner2, owner3]);

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: findByIdsDog,
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match1, match2]),
    });
    const userRepo = buildUserRepo({
      findByIds: findByIdsUser,
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toHaveLength(2);
    // Verify batch calls were made once each
    expect(findByIdsDog).toHaveBeenCalledTimes(1);
    expect(findByIdsUser).toHaveBeenCalledTimes(1);
  });
});
