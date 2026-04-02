import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo } from '../test-utils/builders.js';
import { createUpdateDog } from './update-dog.js';

function buildDeps() {
  const dog = buildDog();
  return {
    dogRepo: buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      update: vi.fn().mockResolvedValue({ ...dog, name: 'Updated Rex' }),
    }),
  };
}

describe('createUpdateDog', () => {
  it('updates and returns the dog profile', async () => {
    const deps = buildDeps();
    const updateDog = createUpdateDog(deps);

    const result = await updateDog('dog-1', 'user-1', { name: 'Updated Rex' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.dog.name).toBe('Updated Rex');
    expect(deps.dogRepo.update).toHaveBeenCalledWith('dog-1', { name: 'Updated Rex' });
  });

  it('fails with 404 when dog not found or not owned', async () => {
    const deps = buildDeps();
    deps.dogRepo.findByIdAndOwner = vi.fn().mockResolvedValue(null);
    const updateDog = createUpdateDog(deps);

    const result = await updateDog('dog-1', 'user-1', { name: 'New' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
