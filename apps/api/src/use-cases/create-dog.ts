import { MAX_DOGS_PER_USER } from '@dogwalk/config';
import type { DogProfile } from '@dogwalk/types';
import { AppError, type Result, fail, succeed } from '@dogwalk/types';
import type { CreateDogInput, DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createCreateDog({ dogRepo }: Deps) {
  return async (
    userId: string,
    input: Omit<CreateDogInput, 'ownerId'>,
  ): Promise<Result<{ dog: DogProfile }>> => {
    const count = await dogRepo.countByOwner(userId);
    if (count >= MAX_DOGS_PER_USER) {
      return fail(
        new AppError(
          'DOG_LIMIT_REACHED',
          `Puoi registrare al massimo ${MAX_DOGS_PER_USER} cani`,
          400,
        ),
      );
    }

    const dog = await dogRepo.create({ ...input, ownerId: userId });
    return succeed({ dog });
  };
}
