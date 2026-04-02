import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo } from '../test-utils/builders.js';
import { createListUserDogs } from './list-user-dogs.js';

describe('createListUserDogs', () => {
  it('returns all active dogs for a user', async () => {
    const dogs = [buildDog({ id: 'dog-1' }), buildDog({ id: 'dog-2', name: 'Bella' })];
    const deps = {
      dogRepo: buildDogRepo({
        findByOwner: vi.fn().mockResolvedValue(dogs),
      }),
    };
    const listDogs = createListUserDogs(deps);

    const result = await listDogs('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.dogs).toHaveLength(2);
    expect(deps.dogRepo.findByOwner).toHaveBeenCalledWith('user-1', true);
  });

  it('returns empty array when user has no dogs', async () => {
    const deps = {
      dogRepo: buildDogRepo({
        findByOwner: vi.fn().mockResolvedValue([]),
      }),
    };
    const listDogs = createListUserDogs(deps);

    const result = await listDogs('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.dogs).toEqual([]);
  });
});
