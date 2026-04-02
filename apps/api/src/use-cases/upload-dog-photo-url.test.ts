import { MAX_PHOTOS_PER_DOG } from '@pawmeet/config';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildStorageService } from '../test-utils/builders.js';
import { createUploadDogPhotoUrl } from './upload-dog-photo-url.js';

function buildDeps() {
  return {
    dogRepo: buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      countPhotos: vi.fn().mockResolvedValue(1),
    }),
    storage: buildStorageService({
      buildDogPhotoKey: vi.fn().mockReturnValue('dogs/dog-1/photo.jpg'),
      generatePresignedUploadUrl: vi.fn().mockResolvedValue('https://upload.example.com/presigned'),
    }),
  };
}

describe('createUploadDogPhotoUrl', () => {
  it('generates presigned upload URL', async () => {
    const deps = buildDeps();
    const uploadUrl = createUploadDogPhotoUrl(deps);

    const result = await uploadUrl('dog-1', 'user-1', 'image/jpeg');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.uploadUrl).toBe('https://upload.example.com/presigned');
    expect(result.data.key).toBe('dogs/dog-1/photo.jpg');
    expect(deps.storage.buildDogPhotoKey).toHaveBeenCalledWith('dog-1', 'image/jpeg');
  });

  it('fails with 404 when dog not found', async () => {
    const deps = buildDeps();
    deps.dogRepo.findByIdAndOwner = vi.fn().mockResolvedValue(null);
    const uploadUrl = createUploadDogPhotoUrl(deps);

    const result = await uploadUrl('dog-1', 'user-1', 'image/jpeg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails with 400 when photo limit reached', async () => {
    const deps = buildDeps();
    deps.dogRepo.countPhotos = vi.fn().mockResolvedValue(MAX_PHOTOS_PER_DOG);
    const uploadUrl = createUploadDogPhotoUrl(deps);

    const result = await uploadUrl('dog-1', 'user-1', 'image/jpeg');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PHOTO_LIMIT_REACHED');
    expect(result.error.status).toBe(400);
  });
});
