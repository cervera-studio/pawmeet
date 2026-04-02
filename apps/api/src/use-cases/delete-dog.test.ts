import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo } from '../test-utils/builders.js';
import { createDeleteDog } from './delete-dog.js';

function buildDeps() {
  return {
    dogRepo: buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
      softDelete: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe('createDeleteDog', () => {
  it('soft-deletes a dog profile', async () => {
    const deps = buildDeps();
    const deleteDog = createDeleteDog(deps);

    const result = await deleteDog('dog-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Dog profile deleted');
    expect(deps.dogRepo.softDelete).toHaveBeenCalledWith('dog-1');
  });

  it('fails with 404 when dog not found or not owned', async () => {
    const deps = buildDeps();
    deps.dogRepo.findByIdAndOwner = vi.fn().mockResolvedValue(null);
    const deleteDog = createDeleteDog(deps);

    const result = await deleteDog('dog-1', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
