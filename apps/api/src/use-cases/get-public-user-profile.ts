import type { PublicUserProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { FollowRepository } from '../ports/follow-repository.js';
import type { DogRepository } from '../ports/index.js';
import type { UserRepository } from '../ports/user-repository.js';

type Deps = {
  userRepo: UserRepository;
  dogRepo: DogRepository;
  followRepo: FollowRepository;
};

export function createGetPublicUserProfile({ userRepo, dogRepo, followRepo }: Deps) {
  return async (
    currentUserId: string,
    targetUserId: string,
  ): Promise<Result<PublicUserProfile>> => {
    if (currentUserId !== targetUserId) {
      const blocked = await followRepo.isBlockedEitherWay(currentUserId, targetUserId);
      if (blocked) {
        return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
      }
    }

    const user = await userRepo.findById(targetUserId);
    if (!user?.isActive) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    if (currentUserId !== targetUserId && user.privacyPrefs?.profileVisible === false) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    const dogs = await dogRepo.findByOwner(targetUserId, true);
    const primaryPhotos = await dogRepo.findPrimaryApprovedPhotosByDogIds(dogs.map((d) => d.id));

    return succeed({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      createdAt: user.createdAt,
      dogs: dogs.map((d) => ({
        id: d.id,
        name: d.name,
        breed: d.breed,
        size: d.size,
        avatarUrl: primaryPhotos.find((p) => p.dogId === d.id)?.url ?? null,
      })),
    });
  };
}
