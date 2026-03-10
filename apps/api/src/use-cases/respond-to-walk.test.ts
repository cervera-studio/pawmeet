import type { DogProfile, Match, Walk } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository, MatchRepository, WalkRepository } from '../ports/index.js';
import { createRespondToWalk } from './respond-to-walk.js';

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-2',
    ownerId: 'user-2',
    name: 'Luna',
    birthDate: new Date('2022-01-01'),
    breed: 'Golden Retriever',
    breedSecondary: null,
    size: 'grande',
    weightKg: 28,
    gender: 'femmina',
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
    updateStatus: vi.fn().mockResolvedValue(buildWalk({ status: 'accepted' })),
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

describe('respondToWalk', () => {
  it('accepts a pending walk when user is the other participant', async () => {
    const walk = buildWalk();
    const match = buildMatch();
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', true);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passeggiata accettata');
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'accepted');
  });

  it('declines a pending walk', async () => {
    const walk = buildWalk();
    const match = buildMatch();
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo({ findById: vi.fn().mockResolvedValue(match) });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([buildDog()]) });
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', false);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passeggiata rifiutata');
    expect(walkRepo.updateStatus).toHaveBeenCalledWith('walk-1', 'declined');
  });

  it('fails when walk does not exist', async () => {
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(null) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', true);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_FOUND');
  });

  it('fails when walk is not pending', async () => {
    const walk = buildWalk({ status: 'accepted' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-2', 'walk-1', true);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_NOT_PENDING');
  });

  it('fails when creator tries to respond to own walk', async () => {
    const walk = buildWalk({ createdBy: 'user-1' });
    const walkRepo = buildWalkRepo({ findById: vi.fn().mockResolvedValue(walk) });
    const matchRepo = buildMatchRepo();
    const dogRepo = buildDogRepo();
    const respondToWalk = createRespondToWalk({ walkRepo, matchRepo, dogRepo });

    const result = await respondToWalk('user-1', 'walk-1', true);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('WALK_CANNOT_RESPOND_OWN');
  });
});
