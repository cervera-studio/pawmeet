import type { DogPhoto } from '@dogwalk/types';
import { AppError, type Result, fail, succeed } from '@dogwalk/types';
import type { DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createReorderDogPhotos({ dogRepo }: Deps) {
  return async (
    dogId: string,
    userId: string,
    photoIds: string[],
  ): Promise<Result<{ photos: DogPhoto[] }>> => {
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    // Verify all photo IDs belong to this dog
    const existingPhotos = await dogRepo.findPhotos(dogId);
    const existingIds = new Set(existingPhotos.map((p) => p.id));
    const allValid = photoIds.every((id) => existingIds.has(id));

    if (!allValid || photoIds.length !== existingPhotos.length) {
      return fail(new AppError('INVALID_PHOTO_IDS', 'Lista foto non valida', 400));
    }

    // Update positions
    const updates = photoIds.map((id, i) => ({
      id,
      position: i,
      isPrimary: i === 0,
    }));
    await dogRepo.updatePhotoPositions(updates);

    // Return updated photos
    const photos = await dogRepo.findPhotos(dogId);
    return succeed({ photos });
  };
}
