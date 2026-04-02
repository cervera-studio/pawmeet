import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo } from '../test-utils/builders.js';
import { createReorderDogPhotos } from './reorder-dog-photos.js';

const photos = [
  { id: 'photo-1', url: 'url-1', position: 0 },
  { id: 'photo-2', url: 'url-2', position: 1 },
  { id: 'photo-3', url: 'url-3', position: 2 },
];

function buildDeps() {
  return {
    dogRepo: buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      findPhotos: vi.fn().mockResolvedValue(photos),
      updatePhotoPositions: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe('createReorderDogPhotos', () => {
  it('reorders photos and sets first as primary', async () => {
    const deps = buildDeps();
    // After reorder, findPhotos returns the new order
    deps.dogRepo.findPhotos = vi
      .fn()
      .mockResolvedValueOnce(photos) // first call: validate
      .mockResolvedValueOnce([photos[2], photos[0], photos[1]]); // second call: return
    const reorder = createReorderDogPhotos(deps);

    const result = await reorder('dog-1', 'user-1', ['photo-3', 'photo-1', 'photo-2']);

    expect(isSuccess(result)).toBe(true);
    expect(deps.dogRepo.updatePhotoPositions).toHaveBeenCalledWith([
      { id: 'photo-3', position: 0, isPrimary: true },
      { id: 'photo-1', position: 1, isPrimary: false },
      { id: 'photo-2', position: 2, isPrimary: false },
    ]);
  });

  it('fails with 404 when dog not found', async () => {
    const deps = buildDeps();
    deps.dogRepo.findByIdAndOwner = vi.fn().mockResolvedValue(null);
    const reorder = createReorderDogPhotos(deps);

    const result = await reorder('dog-1', 'user-1', ['photo-1']);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails with 400 when photo IDs do not match existing', async () => {
    const deps = buildDeps();
    const reorder = createReorderDogPhotos(deps);

    const result = await reorder('dog-1', 'user-1', ['photo-1', 'photo-INVALID']);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_PHOTO_IDS');
    expect(result.error.status).toBe(400);
  });

  it('fails with 400 when photo count does not match', async () => {
    const deps = buildDeps();
    const reorder = createReorderDogPhotos(deps);

    // Only 2 IDs but 3 photos exist
    const result = await reorder('dog-1', 'user-1', ['photo-1', 'photo-2']);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_PHOTO_IDS');
  });
});
