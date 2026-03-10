import type { DogPhoto, DogProfile } from '@dogwalk/types';
import { AppError, type Result, fail, succeed } from '@dogwalk/types';
import type { DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createGetDog({ dogRepo }: Deps) {
  return async (dogId: string): Promise<Result<{ dog: DogProfile; photos: DogPhoto[] }>> => {
    const dog = await dogRepo.findById(dogId);
    if (!dog || !dog.isActive) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    const photos = await dogRepo.findPhotos(dogId);
    return succeed({ dog, photos });
  };
}
