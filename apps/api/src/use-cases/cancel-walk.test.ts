import type { DogProfile, Match, Walk } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository, MatchRepository, WalkRepository } from '../ports/index.js';
import { createCancelWalk } from './cancel-walk.js';

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
    create: vi.fn(),
    findById: vi.fn(),
    findByMatchId: vi.fn(),
    findUpcoming: vi.fn(),
    updateStatus: vi.fn().mockResolvedValue(buildWalk({ status: 'cancelled' })),
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

describe('cancelWalk', () => {
  it('cancels a pending walk when user is a participant', async () => {
    const walk = buildWalk({ status: 'pending' });
    const match = buildMatch();
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passeggiata annullata');
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'cancelled');
  });

  it('cancels an accepted walk', async () => {
    const walk = buildWalk({ status: 'accepted' });
    const match = buildMatch();
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isSuccess(result)).toBe(true);
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'cancelled');
  });

  it('fails when walk does not exist', async () => {
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(null) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_FOUND');
  });

  it('fails when walk is already completed', async () => {
    const walk = buildWalk({ status: 'completed' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_CANNOT_CANCEL');
  });

  it('fails when user is not a participant', async () => {
    const walk = buildWalk();
    const match = buildMatch({ dogAId: 'dog-x', dogBId: 'dog-y' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-1' })]),
    });
    const cancelWalk = createCancelWalk({ walkRepo, matchRepo, dogRepo });

    const result = await cancelWalk('user-1', 'walk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
    expect(walkRepo.updateStatus).not.toHaveBeenCalled();
  });
});
