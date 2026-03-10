import { MAX_PHOTOS_PER_DOG } from '@dogwalk/config';
import { AppError, type Result, fail, succeed } from '@dogwalk/types';
import type { DogRepository, StorageService } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
  storage: StorageService;
};

export function createUploadDogPhotoUrl({ dogRepo, storage }: Deps) {
  return async (
    dogId: string,
    userId: string,
    contentType: string,
  ): Promise<Result<{ uploadUrl: string; key: string }>> => {
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
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

    const key = storage.buildDogPhotoKey(dogId, contentType);
    const uploadUrl = await storage.generatePresignedUploadUrl(key, contentType);
    return succeed({ uploadUrl, key });
  };
}
