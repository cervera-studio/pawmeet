import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { Breed, BreedRepository } from '../ports/breed-repository.js';
import { createSearchBreeds } from './search-breeds.js';

const buildBreedRepo = (overrides: Partial<BreedRepository> = {}): BreedRepository => ({
  search: vi.fn().mockResolvedValue([]),
  ...overrides,
});

describe('createSearchBreeds', () => {
  it('returns matching breeds for a query', async () => {
    const breeds: Breed[] = [
      {
        id: 'breed-1',
        code: 'labrador_retriever',
        group: 'sporting',
        sizeCategory: 'large',
        avgWeightKg: 30,
        energy: 4,
        playfulness: 5,
        trainability: 5,
        barking: 3,
        goodWithOtherDogs: 5,
        goodWithChildren: 5,
        goodWithStrangers: 5,
        protectiveness: 2,
        shedding: 4,
        grooming: 2,
      },
    ];
    const breedRepo = buildBreedRepo({ search: vi.fn().mockResolvedValue(breeds) });
    const execute = createSearchBreeds({ breedRepo });

    const result = await execute('labrador');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.breeds).toHaveLength(1);
    expect(result.data.breeds[0].code).toBe('labrador_retriever');
    expect(breedRepo.search).toHaveBeenCalledWith('labrador');
  });
});
