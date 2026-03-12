import { MAX_PHOTOS_PER_DOG } from '@pawmeet/config';
import type { DogPhoto } from '@pawmeet/types';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildStorageService } from '../test-utils/builders.js';
import { createConfirmDogPhoto } from './confirm-dog-photo.js';

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

describe('createConfirmDogPhoto', () => {
  it('confirms first photo as primary at position 0', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      countPhotos: vi.fn().mockResolvedValue(0),
      addPhoto: vi.fn().mockResolvedValue(buildPhoto()),
    });
    const storage = buildStorageService({
      buildDogPhotoKey: vi.fn().mockReturnValue('dogs/dog_1/abc.jpg'),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/dogs/dog_1/abc.jpg'),
    });
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
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      countPhotos: vi.fn().mockResolvedValue(2),
      addPhoto: vi.fn().mockResolvedValue(buildPhoto({ position: 2, isPrimary: false })),
    });
    const storage = buildStorageService({
      buildDogPhotoKey: vi.fn().mockReturnValue('dogs/dog_1/abc.jpg'),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/dogs/dog_1/abc.jpg'),
    });
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/dog_1/abc.jpg');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(dogRepo.addPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ position: 2, isPrimary: false }),
    );
  });

  it('fails with 403 when key does not match dog', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      addPhoto: vi.fn().mockResolvedValue(buildPhoto()),
    });
    const storage = buildStorageService({
      buildDogPhotoKey: vi.fn().mockReturnValue('dogs/dog_1/abc.jpg'),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/dogs/dog_1/abc.jpg'),
    });
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/OTHER_DOG/abc.jpg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_PHOTO_KEY');
    expect(result.error.status).toBe(403);
  });

  it('fails with 400 when max photos limit reached', async () => {
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      countPhotos: vi.fn().mockResolvedValue(MAX_PHOTOS_PER_DOG),
      addPhoto: vi.fn().mockResolvedValue(buildPhoto()),
    });
    const storage = buildStorageService({
      buildDogPhotoKey: vi.fn().mockReturnValue('dogs/dog_1/abc.jpg'),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/dogs/dog_1/abc.jpg'),
    });
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
    const storage = buildStorageService({
      buildDogPhotoKey: vi.fn().mockReturnValue('dogs/dog_1/abc.jpg'),
      getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/dogs/dog_1/abc.jpg'),
    });
    const confirmPhoto = createConfirmDogPhoto({ dogRepo, storage });

    const result = await confirmPhoto('dog_1', 'usr_1', 'dogs/dog_1/abc.jpg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
