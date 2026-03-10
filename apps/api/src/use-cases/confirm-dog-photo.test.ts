import { MAX_PHOTOS_PER_DOG } from '@dogwalk/config';
import type { DogPhoto, DogProfile } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository, StorageService } from '../ports/index.js';
import { createConfirmDogPhoto } from './confirm-dog-photo.js';

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
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function buildPhoto(overrides: Partial<DogPhoto> = {}): DogPhoto {
  return {
    id: 'photo_1',
    dogId: 'dog_1',
    url: 'https://cdn.example.com/dogs/dog_1/abc.jpg',
    position: 0,
    isPrimary: true,
    moderationStatus: 'pending',
    uploadedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByIds: vi.fn().mockResolvedValue([]),
    findByOwner: vi.fn().mockResolvedValue([]),
    findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    countByOwner: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue(buildDog()),
    update: vi.fn().mockResolvedValue(buildDog()),
    softDelete: vi.fn().mockResolvedValue(undefined),
    findPhotos: vi.fn().mockResolvedValue([]),
    countPhotos: vi.fn().mockResolvedValue(0),
    addPhoto: vi.fn().mockResolvedValue(buildPhoto()),
    findPhoto: vi.fn().mockResolvedValue(null),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    updatePhotoPositions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildStorage(overrides: Partial<StorageService> = {}): StorageService {
  return {
    generatePresignedUploadUrl: vi.fn().mockResolvedValue('https://upload.example.com'),
    generateAvatarUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: '', key: '' }),
    buildDogPhotoKey: vi.fn().mockReturnValue('dogs/dog_1/abc.jpg'),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/dogs/dog_1/abc.jpg'),
    extractKeyFromUrl: vi.fn().mockReturnValue('dogs/dog_1/abc.jpg'),
    ...overrides,
  };
}

describe('createConfirmDogPhoto', () => {
  it('confirms first photo as primary at position 0', async () => {
    const dogRepo = buildDogRepo({ countPhotos: vi.fn().mockResolvedValue(0) });
    const storage = buildStorage();
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/dog_1/abc.jpg');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.photo.isPrimary).toBe(true);
    expect(dogRepo.addPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ position: 0, isPrimary: true }),
    );
  });

  it('adds subsequent photo as non-primary', async () => {
    const dogRepo = buildDogRepo({
      countPhotos: vi.fn().mockResolvedValue(2),
      addPhoto: vi.fn().mockResolvedValue(buildPhoto({ position: 2, isPrimary: false })),
    });
    const storage = buildStorage();
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/dog_1/abc.jpg');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(dogRepo.addPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ position: 2, isPrimary: false }),
    );
  });

  it('fails with 403 when key does not match dog', async () => {
    const dogRepo = buildDogRepo();
    const storage = buildStorage();
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/OTHER_DOG/abc.jpg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_PHOTO_KEY');
    expect(result.error.status).toBe(403);
  });

  it('fails with 400 when max photos limit reached', async () => {
    const dogRepo = buildDogRepo({
      countPhotos: vi.fn().mockResolvedValue(MAX_PHOTOS_PER_DOG),
    });
    const storage = buildStorage();
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/dog_1/abc.jpg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PHOTO_LIMIT_REACHED');
    expect(result.error.status).toBe(400);
  });

  it('fails with 404 when dog not owned by user', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(null),
    });
    const storage = buildStorage();
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/dog_1/abc.jpg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
