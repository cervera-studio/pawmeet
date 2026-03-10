import type { DogProfile, Match } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository, MatchRepository } from '../ports/index.js';
import { createUnmatch } from './unmatch.js';

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
    compatibilityScore: 0.75,
    createdAt: new Date(),
    isActive: true,
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
    softDelete: vi.fn().mockResolvedValue(undefined),
    findSwipedDogIds: vi.fn(),
    countDailySwipes: vi.fn(),
    findSwipe: vi.fn(),
    findReciprocalLike: vi.fn(),
    createSwipe: vi.fn(),
    findCandidateDogs: vi.fn(),
    ...overrides,
  };
}

describe('unmatch', () => {
  it('soft-deletes a match when user owns one of the dogs', async () => {
    const match = buildMatch();
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog()]),
    });
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Match annullato');
    expect(matchRepo.softDelete).toHaveBeenCalledWith('match-1');
  });

  it('fails with MATCH_NOT_FOUND when match does not exist', async () => {
    const dogRepo = buildDogRepo();
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with MATCH_NOT_FOUND when match is inactive', async () => {
    const match = buildMatch({ isActive: false });
    const dogRepo = buildDogRepo();
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
  });

  it('fails when user does not own either dog in the match', async () => {
    const match = buildMatch({ dogAId: 'dog-x', dogBId: 'dog-y' });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const unmatch = createUnmatch({ dogRepo, matchRepo });

    const result = await unmatch('user-1', 'match-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(matchRepo.softDelete).not.toHaveBeenCalled();
  });
});
