import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { DogRepository } from '../ports/dog-repository.js';
import type { FeedRepository } from '../ports/feed-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface UserDataExport {
  exportedAt: string;
  profile: {
    email: string;
    displayName: string;
    authProvider: string;
    avatarUrl: string | null;
    searchRadiusKm: number;
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  };
  dogs: {
    name: string;
    breed: string;
    size: string;
    energyLevel: string;
    bio: string | null;
    birthDate: string | null;
    createdAt: string;
  }[];
  posts: {
    caption: string | null;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
  }[];
}

interface Deps {
  userRepo: UserRepository;
  dogRepo: DogRepository;
  feedRepo: FeedRepository;
}

/**
 * Export all user data in a portable JSON format.
 * GDPR Art. 20 — Right to data portability.
 */
export function createExportUserData(deps: Deps) {
  return async (userId: string): Promise<Result<UserDataExport>> => {
    const { userRepo, dogRepo, feedRepo } = deps;

    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    // Fetch user's dogs
    const dogs = await dogRepo.findByOwner(userId);

    // Fetch user's posts (first page, up to 1000)
    const { items: posts } = await feedRepo.getUserPosts(userId, userId, null, 1000);

    return succeed({
      exportedAt: new Date().toISOString(),
      profile: {
        email: user.email,
        displayName: user.displayName,
        authProvider: user.authProvider,
        avatarUrl: user.avatarUrl,
        searchRadiusKm: user.searchRadiusKm,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
      dogs: dogs.map((d) => ({
        name: d.name,
        breed: d.breed,
        size: d.size,
        energyLevel: d.energyLevel,
        bio: d.bio,
        birthDate: d.birthDate.toISOString(),
        createdAt: d.createdAt.toISOString(),
      })),
      posts: posts.map((p) => ({
        caption: p.caption,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  };
}
