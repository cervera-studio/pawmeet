import { type Result, succeed } from '@dogwalk/types';
import type { Breed, BreedRepository } from '../ports/index.js';

type Deps = {
  breedRepo: BreedRepository;
};

export function createSearchBreeds({ breedRepo }: Deps) {
  return async (query?: string): Promise<Result<{ breeds: Breed[] }>> => {
    const breeds = await breedRepo.search(query);
    return succeed({ breeds });
  };
}
