import type { PublicDogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { DogRepository } from '../ports/index.js';
import type { UserRepository } from '../ports/user-repository.js';

type Deps = {
  dogRepo: DogRepository;
  userRepo: UserRepository;
};

export function createGetPublicDogProfile({ dogRepo, userRepo }: Deps) {
  return async (dogId: string): Promise<Result<PublicDogProfile>> => {
    const dog = await dogRepo.findById(dogId);
    if (!dog?.isActive) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    const owner = await userRepo.findById(dog.ownerId);
    if (!owner) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    const photos = await dogRepo.findPhotos(dogId);
    const approvedPhotos = photos
      .filter((p) => p.moderationStatus === 'approved')
      .map(({ url, position, isPrimary }) => ({ url, position, isPrimary }));

    const now = new Date();
    const birth = dog.birthDate;
    const ageMonths =
      (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

    const ownerFirstName = owner.displayName.split(' ')[0] ?? owner.displayName;

    return succeed({
      id: dog.id,
      name: dog.name,
      breed: dog.breed,
      breedSecondary: dog.breedSecondary,
      size: dog.size,
      weightKg: dog.weightKg,
      gender: dog.gender,
      energyLevel: dog.energyLevel,
      behaviorWithDogs: dog.behaviorWithDogs,
      bio: dog.bio,
      ageMonths,
      ownerFirstName,
      photos: approvedPhotos,
    });
  };
}
