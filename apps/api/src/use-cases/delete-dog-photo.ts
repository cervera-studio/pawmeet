import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { DogRepository, StorageService } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  storage: StorageService;
};

export function createDeleteDogPhoto({ dogRepo, storage }: Deps) {
  return async (
    dogId: string,
    photoId: string,
    userId: string,
  ): Promise<Result<{ message: string }>> => {
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    const photo = await dogRepo.findPhoto(photoId, dogId);
    if (!photo) {
      return fail(new AppError('PHOTO_NOT_FOUND', 'Photo not found', 404));
    }

    // Delete from storage (ignore errors if already gone)
    const key = storage.extractKeyFromUrl(photo.url);
    try {
      await storage.deleteObject(key);
    } catch (e) {
      logger.warn('DeleteDogPhoto', 'Failed to delete photo from storage', e);
    }

    // Delete from DB
    await dogRepo.deletePhoto(photoId);

    // Reorder remaining photos
    const remaining = await dogRepo.findPhotos(dogId);
    if (remaining.length > 0) {
      const updates = remaining.map((p, i) => ({
        id: p.id,
        position: i,
        isPrimary: i === 0,
      }));
      await dogRepo.updatePhotoPositions(updates);
    }

    return succeed({ message: 'Foto eliminata' });
  };
}
