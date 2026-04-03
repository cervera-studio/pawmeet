import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildStorageService } from '../test-utils/builders.js';
import { createDeleteDogPhoto } from './delete-dog-photo.js';

function buildDeps() {
  return {
    dogRepo: buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      findPhoto: vi.fn().mockResolvedValue({
        id: 'photo-1',
        url: 'https://cdn.example.com/dogs/photo.jpg',
        position: 0,
      }),
      deletePhoto: vi.fn().mockResolvedValue(undefined),
      findPhotos: vi
        .fn()
        .mockResolvedValue([
          { id: 'photo-2', url: 'https://cdn.example.com/dogs/photo2.jpg', position: 0 },
        ]),
      updatePhotoPositions: vi.fn().mockResolvedValue(undefined),
    }),
    storage: buildStorageService(),
  };
}

describe('createDeleteDogPhoto', () => {
  it('deletes photo from storage and DB, then reorders remaining', async () => {
    const deps = buildDeps();
    const deleteDogPhoto = createDeleteDogPhoto(deps);

    const result = await deleteDogPhoto('dog-1', 'photo-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Photo deleted');
    expect(deps.storage.deleteObject).toHaveBeenCalled();
    expect(deps.dogRepo.deletePhoto).toHaveBeenCalledWith('photo-1');
    expect(deps.dogRepo.updatePhotoPositions).toHaveBeenCalledWith([
      { id: 'photo-2', position: 0, isPrimary: true },
    ]);
  });

  it('skips reorder when no remaining photos', async () => {
    const deps = buildDeps();
    deps.dogRepo.findPhotos = vi.fn().mockResolvedValue([]);
    const deleteDogPhoto = createDeleteDogPhoto(deps);

    const result = await deleteDogPhoto('dog-1', 'photo-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    expect(deps.dogRepo.updatePhotoPositions).not.toHaveBeenCalled();
  });

  it('succeeds even if storage deletion fails', async () => {
    const deps = buildDeps();
    deps.storage.deleteObject = vi.fn().mockRejectedValue(new Error('storage error'));
    const deleteDogPhoto = createDeleteDogPhoto(deps);

    const result = await deleteDogPhoto('dog-1', 'photo-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    expect(deps.dogRepo.deletePhoto).toHaveBeenCalledWith('photo-1');
  });

  it('fails with 404 when dog not found', async () => {
    const deps = buildDeps();
    deps.dogRepo.findByIdAndOwner = vi.fn().mockResolvedValue(null);
    const deleteDogPhoto = createDeleteDogPhoto(deps);

    const result = await deleteDogPhoto('dog-1', 'photo-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails with 404 when photo not found', async () => {
    const deps = buildDeps();
    deps.dogRepo.findPhoto = vi.fn().mockResolvedValue(null);
    const deleteDogPhoto = createDeleteDogPhoto(deps);

    const result = await deleteDogPhoto('dog-1', 'photo-99', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PHOTO_NOT_FOUND');
  });
});
