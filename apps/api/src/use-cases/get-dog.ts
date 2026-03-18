import type { DogPhoto, DogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createGetDog({ dogRepo }: Deps) {
  return async (dogId: string): Promise<Result<{ dog: DogProfile; photos: DogPhoto[] }>> => {
    const dog = await dogRepo.findById(dogId);
    if (!dog?.isActive) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    const photos = await dogRepo.findPhotos(dogId);
    return succeed({ dog, photos });
  };
}
