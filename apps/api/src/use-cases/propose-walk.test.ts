import type { DogProfile, Match, Walk, WalkStatus } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository, MatchRepository, WalkRepository } from '../ports/index.js';
import { createProposeWalk } from './propose-walk.js';

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

function buildWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: 'walk-1',
    matchId: 'match-1',
    createdBy: 'user-1',
    title: null,
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 30,
    location: null,
    latitude: null,
    longitude: null,
    status: 'pending',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildWalkRepo(overrides: Partial<WalkRepository> = {}): WalkRepository {
  return {
    create: vi.fn().mockResolvedValue(buildWalk()),
    findById: vi.fn(),
    findByMatchId: vi.fn(),
    findUpcoming: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
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

const futureDate = new Date('2027-06-15T10:00:00Z');

describe('proposeWalk', () => {
  it('creates a walk proposal when user is a match participant', async () => {
    const match = buildMatch();
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const walkRepo = buildWalkRepo();
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: futureDate,
      durationMin: 30,
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.walkId).toBe('walk-1');
    expect(walkRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match-1',
        createdBy: 'user-1',
        status: 'pending',
      }),
    );
  });

  it('fails when match does not exist', async () => {
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(null) });
    const dogRepo = buildDogRepo();
    const walkRepo = buildWalkRepo();
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: futureDate,
      durationMin: 30,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
  });

  it('fails when user is not a participant in the match', async () => {
    const match = buildMatch({ dogAId: 'dog-x', dogBId: 'dog-y' });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const walkRepo = buildWalkRepo();
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: futureDate,
      durationMin: 30,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(walkRepo.create).not.toHaveBeenCalled();
  });

  it('fails when scheduledAt is in the past', async () => {
    const match = buildMatch();
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const walkRepo = buildWalkRepo();
    const proposeWalk = createProposeWalk({ walkRepo, matchRepo, dogRepo });

    const result = await proposeWalk('user-1', {
      matchId: 'match-1',
      scheduledAt: new Date('2020-01-01'),
      durationMin: 30,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_INVALID_DATE');
    expect(walkRepo.create).not.toHaveBeenCalled();
  });
});
