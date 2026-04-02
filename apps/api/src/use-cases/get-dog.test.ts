import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo } from '../test-utils/builders.js';
import { createGetDog } from './get-dog.js';

function buildDeps() {
  return {
    dogRepo: buildDogRepo({
      findById: vi.fn().mockResolvedValue(buildDog({ isActive: true })),
      findPhotos: vi
        .fn()
        .mockResolvedValue([
          { id: 'photo-1', url: 'https://cdn.example.com/dogs/photo.jpg', position: 0 },
        ]),
    }),
  };
}

describe('createGetDog', () => {
  it('returns dog profile and photos', async () => {
    const deps = buildDeps();
    const getDog = createGetDog(deps);

    const result = await getDog('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.dog.id).toBe('dog-1');
    expect(result.data.photos).toHaveLength(1);
  });

  it('fails with 404 when dog not found', async () => {
    const deps = buildDeps();
    deps.dogRepo.findById = vi.fn().mockResolvedValue(null);
    const getDog = createGetDog(deps);

    const result = await getDog('dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails with 404 when dog is inactive', async () => {
    const deps = buildDeps();
    deps.dogRepo.findById = vi.fn().mockResolvedValue(buildDog({ isActive: false }));
    const getDog = createGetDog(deps);

    const result = await getDog('dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });
});
