import { MAX_DOGS_PER_USER } from '@dogwalk/config';
import type { DogProfile } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { CreateDogInput, DogRepository } from '../ports/index.js';
import { createCreateDog } from './create-dog.js';

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog_1',
    ownerId: 'usr_1',
    name: 'Fido',
    birthDate: new Date('2022-03-15'),
    breed: 'labrador',
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
    walkPrefTime: ['mattina', 'sera'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function buildDogInput(): Omit<CreateDogInput, 'ownerId'> {
  return {
    name: 'Fido',
    birthDate: new Date('2022-03-15'),
    breed: 'labrador',
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
  };
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByIds: vi.fn().mockResolvedValue([]),
    findByOwner: vi.fn().mockResolvedValue([]),
    findByIdAndOwner: vi.fn().mockResolvedValue(null),
    countByOwner: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue(buildDog()),
    update: vi.fn().mockResolvedValue(buildDog()),
    softDelete: vi.fn().mockResolvedValue(undefined),
    findPhotos: vi.fn().mockResolvedValue([]),
    countPhotos: vi.fn().mockResolvedValue(0),
    addPhoto: vi.fn().mockResolvedValue(null),
    findPhoto: vi.fn().mockResolvedValue(null),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    updatePhotoPositions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('createCreateDog', () => {
  it('creates a dog profile successfully', async () => {
    const dogRepo = buildDogRepo();
    const createDog = createCreateDog({ dogRepo });

    const result = await createDog('usr_1', buildDogInput());

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.dog.name).toBe('Fido');
    expect(dogRepo.create).toHaveBeenCalledOnce();
  });

  it('fails with 400 when max dogs limit reached', async () => {
    const dogRepo = buildDogRepo({
      countByOwner: vi.fn().mockResolvedValue(MAX_DOGS_PER_USER),
    });
    const createDog = createCreateDog({ dogRepo });

    const result = await createDog('usr_1', buildDogInput());

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_LIMIT_REACHED');
    expect(result.error.status).toBe(400);
    expect(dogRepo.create).not.toHaveBeenCalled();
  });
});
