import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { StorageService } from '../ports/storage-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface DeleteAccountOutput {
  message: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  storage: StorageService;
}

/**
 * Soft-delete user account: deactivates immediately and revokes all tokens.
 * User data is retained for 30 days (GDPR grace period) before hard deletion
 * by the data-cleanup job.
 */
export function createDeleteAccount(deps: Deps) {
  return async (userId: string): Promise<Result<DeleteAccountOutput>> => {
    const { userRepo, tokenRepo, storage } = deps;

    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    // Deactivate account immediately
    await userRepo.update(userId, { isActive: false });

    // Revoke all refresh tokens (force logout on all devices)
    await tokenRepo.revokeAllUserRefreshTokens(userId);

    // Clear push token
    await userRepo.updatePushToken(userId, null);

    // Delete avatar from storage if present
    if (user.avatarUrl) {
      try {
        const key = storage.extractKeyFromUrl(user.avatarUrl);
        await storage.deleteObject(key);
      } catch (err) {
        logger.warn('DeleteAccount', 'Failed to delete avatar from R2', err);
      }
      await userRepo.update(userId, { avatarUrl: null });
    }

    logSecurityEvent({
      event: SECURITY_EVENT.Logout,
      userId,
      email: user.email,
      metadata: { reason: 'account_deletion' },
    });

    return succeed({
      message: 'Account disattivato. I tuoi dati verranno eliminati entro 30 giorni.',
    });
  };
}
