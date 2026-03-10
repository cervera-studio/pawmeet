import type { DogProfile } from '@dogwalk/types';
import { AppError, type Result, fail, succeed } from '@dogwalk/types';
import type { CreateDogInput, DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createUpdateDog({ dogRepo }: Deps) {
  return async (
    dogId: string,
    userId: string,
    input: Partial<CreateDogInput>,
  ): Promise<Result<{ dog: DogProfile }>> => {
    const existing = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!existing) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    const dog = await dogRepo.update(dogId, input);
    return succeed({ dog });
  };
}
