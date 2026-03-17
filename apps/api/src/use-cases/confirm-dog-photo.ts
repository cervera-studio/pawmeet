import { MAX_PHOTOS_PER_DOG } from '@pawmeet/config';
import type { DogPhoto } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { DogRepository, StorageService } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  storage: StorageService;
};

export function createConfirmDogPhoto({ dogRepo, storage }: Deps) {
  return async (
    dogId: string,
    userId: string,
    key: string,
  ): Promise<Result<{ photo: DogPhoto }>> => {
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    // Strict key validation: must be exactly dogs/{dogId}/{filename}
    // Prevents path traversal (../) and cross-dog photo hijacking
    const KEY_PATTERN = /^dogs\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
    if (!key.startsWith(`dogs/${dogId}/`) || !KEY_PATTERN.test(key)) {
      return fail(new AppError('INVALID_PHOTO_KEY', 'Chiave non valida', 403));
    }

    const photoCount = await dogRepo.countPhotos(dogId);
    if (photoCount >= MAX_PHOTOS_PER_DOG) {
      return fail(
        new AppError(
          'PHOTO_LIMIT_REACHED',
          `Puoi caricare al massimo ${MAX_PHOTOS_PER_DOG} foto per cane`,
          400,
        ),
      );
    }

    const position = photoCount;
    const isPrimary = position === 0;
    const publicUrl = storage.getPublicUrl(key);

    const photo = await dogRepo.addPhoto({ dogId, url: publicUrl, position, isPrimary });
    return succeed({ photo });
  };
}
