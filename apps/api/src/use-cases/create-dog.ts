import { MAX_DOGS_PER_USER } from '@pawmeet/config';
import type { DogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
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

    logger.info('CreateDog', 'Dog created', { userId, dogId: dog.id });

    return succeed({ dog });
  };
}
