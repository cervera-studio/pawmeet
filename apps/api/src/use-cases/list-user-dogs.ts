import type { DogProfile } from '@pawmeet/types';
import { type Result, succeed } from '@pawmeet/types';
import type { DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createListUserDogs({ dogRepo }: Deps) {
  return async (userId: string): Promise<Result<{ dogs: DogProfile[] }>> => {
    const dogs = await dogRepo.findByOwner(userId, true);
    return succeed({ dogs });
  };
}
