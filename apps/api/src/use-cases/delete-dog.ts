import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createDeleteDog({ dogRepo }: Deps) {
  return async (dogId: string, userId: string): Promise<Result<{ message: string }>> => {
    const existing = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!existing) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    await dogRepo.softDelete(dogId);
    return succeed({ message: 'Profilo cane eliminato' });
  };
}
