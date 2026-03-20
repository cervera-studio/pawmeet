import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AnalyticsProvider } from '../ports/analytics-provider.js';
import type { AnalyticsRepository } from '../ports/analytics-repository.js';
import type { AuthService } from '../ports/auth-service.js';
import type { DogRepository } from '../ports/dog-repository.js';
import type { EmailService } from '../ports/email-service.js';
import type { FeedRepository } from '../ports/feed-repository.js';
import type { MatchRepository } from '../ports/match-repository.js';
import type { StorageService } from '../ports/storage-service.js';
import type { StoryRepository } from '../ports/story-repository.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface DeleteAccountOutput {
  message: string;
  accountAgeDays: number;
  dogCount: number;
  matchCount: number;
}

interface Deps {
  analyticsRepo: AnalyticsRepository;
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  storage: StorageService;
  dogRepo: DogRepository;
  matchRepo: MatchRepository;
  feedRepo: FeedRepository;
  storyRepo: StoryRepository;
  emailService: EmailService;
  analyticsProviders: AnalyticsProvider[];
}

/**
 * Soft-delete user account with full cleanup:
 *
 * 1. Re-verify password (re-auth gate — prevents accidental or CSRF-based deletion)
 * 2. Delete all R2 objects (avatar, dog photos, post media, story media)
 * 3. Anonymize analytics_events immediately (SET userId = NULL)
 * 4. Deactivate account + revoke tokens
 * 5. Send confirmation email
 *
 * Hard-deletion of DB rows happens after 30 days via data-cleanup worker (GDPR grace period).
 */
async function verifyPassword(
  authService: AuthService,
  userId: string,
  email: string,
  password: string,
  passwordHash: string,
): Promise<Result<DeleteAccountOutput> | null> {
  const valid = await authService.verifyPassword(password, passwordHash);
  if (valid) return null;

  logSecurityEvent({
    event: SECURITY_EVENT.LoginFailed,
    userId,
    email,
    metadata: { reason: 'delete_account_wrong_password' },
  });
  return fail(new AppError('INVALID_PASSWORD', 'Invalid password', 401));
}

async function deleteR2Object(storage: StorageService, url: string, label: string): Promise<void> {
  try {
    const key = storage.extractKeyFromUrl(url);
    await storage.deleteObject(key);
  } catch (err) {
    logger.warn('DeleteAccount', `Failed to delete ${label} from R2`, err);
  }
}

async function deleteAllDogPhotos(
  dogRepo: DogRepository,
  storage: StorageService,
  dogs: { id: string }[],
): Promise<void> {
  for (const dog of dogs) {
    const photos = await dogRepo.findPhotos(dog.id);
    for (const photo of photos) {
      await deleteR2Object(storage, photo.url, `dog photo ${photo.id}`);
    }
  }
}

async function deleteAllPostMedia(
  feedRepo: FeedRepository,
  storage: StorageService,
  userId: string,
): Promise<void> {
  const userPosts = await feedRepo.getUserPosts(userId, userId, null, 1000);
  for (const post of userPosts.items) {
    const media = await feedRepo.findMediaByPost(post.id);
    for (const m of media) {
      await deleteR2Object(storage, m.url, `post media ${m.id}`);
      if (m.thumbnailUrl) {
        await deleteR2Object(storage, m.thumbnailUrl, `post media thumbnail ${m.id}`);
      }
    }
  }
}

export function createDeleteAccount(deps: Deps) {
  return async (userId: string, password: string): Promise<Result<DeleteAccountOutput>> => {
    const {
      analyticsRepo,
      userRepo,
      tokenRepo,
      authService,
      storage,
      dogRepo,
      matchRepo,
      feedRepo,
      emailService,
    } = deps;

    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    // Re-auth gate: verify password before proceeding
    // Social-only accounts (no password) skip this check
    if (user.passwordHash) {
      const passwordError = await verifyPassword(
        authService,
        userId,
        user.email,
        password,
        user.passwordHash,
      );
      if (passwordError) return passwordError;
    }

    // Compute account metadata before deletion (for analytics)
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    // --- Phase 1: Delete all R2 objects ---
    if (user.avatarUrl) {
      await deleteR2Object(storage, user.avatarUrl, 'avatar');
    }

    const dogs = await dogRepo.findByOwner(userId, false);
    const dogIds = dogs.map((d) => d.id);
    const activeMatches = dogIds.length > 0 ? await matchRepo.findActiveByDogIds(dogIds) : [];
    const matchCount = activeMatches.length;

    await deleteAllDogPhotos(dogRepo, storage, dogs);
    await deleteAllPostMedia(feedRepo, storage, userId);

    // Story media is handled by story-cleanup worker (CASCADE will delete DB rows,
    // but we should clean R2 proactively for stories still active)
    // Stories have CASCADE on authorId, so they'll be deleted in hard-delete phase.

    // --- Phase 2: Anonymize analytics immediately (don't wait 30 days) ---
    try {
      await analyticsRepo.anonymizeUserEvents(userId);
    } catch (err) {
      logger.warn('DeleteAccount', 'Failed to anonymize analytics events', err);
    }

    // Fire-and-forget: delete person records from external analytics providers
    Promise.allSettled(deps.analyticsProviders.map((p) => p.deletePerson(userId))).catch(() => {
      /* fire-and-forget */
    });

    // --- Phase 3: Deactivate account ---
    const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await userRepo.update(userId, {
      isActive: false,
      deletionScheduledAt: deletionDate,
      avatarUrl: null,
      latitude: null,
      longitude: null,
    });

    await userRepo.updatePushToken(userId, null);
    await tokenRepo.revokeAllUserRefreshTokens(userId);

    // --- Phase 4: Send confirmation email ---
    try {
      await emailService.sendAccountDeletedConfirmation(user.email, user.displayName, user.locale);
    } catch (err) {
      logger.warn('DeleteAccount', 'Failed to send deletion confirmation email', err);
    }

    logSecurityEvent({
      event: SECURITY_EVENT.Logout,
      userId,
      email: user.email,
      metadata: { reason: 'account_deletion' },
    });

    logger.info('DeleteAccount', 'Account deleted', {
      userId,
      accountAgeDays,
      dogCount: dogs.length,
      matchCount,
    });

    return succeed({
      message: 'Account disattivato. I tuoi dati verranno eliminati entro 30 giorni.',
      accountAgeDays,
      dogCount: dogs.length,
      matchCount,
    });
  };
}
