import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface ReactivateAccountOutput {
  message: string;
}

interface Deps {
  userRepo: UserRepository;
  authService: AuthService;
}

/**
 * Reactivate a deactivated account during the 30-day grace period.
 * Clears deletionScheduledAt and sets isActive back to true.
 * Requires password re-verification (social-only accounts skip).
 */
export function createReactivateAccount(deps: Deps) {
  return async (userId: string, password: string): Promise<Result<ReactivateAccountOutput>> => {
    const { userRepo, authService } = deps;

    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    if (user.isActive) {
      return fail(new AppError('ALREADY_ACTIVE', 'Account già attivo', 400));
    }

    if (!user.deletionScheduledAt) {
      return fail(new AppError('CANNOT_REACTIVATE', 'Account cannot be reactivated', 400));
    }

    // Check if grace period has expired
    if (new Date() >= user.deletionScheduledAt) {
      return fail(new AppError('GRACE_PERIOD_EXPIRED', 'Il periodo di grazia è scaduto', 410));
    }

    // Re-auth gate
    if (user.passwordHash) {
      const valid = await authService.verifyPassword(password, user.passwordHash);
      if (!valid) {
        logSecurityEvent({
          event: SECURITY_EVENT.LoginFailed,
          userId,
          email: user.email,
          metadata: { reason: 'reactivate_wrong_password' },
        });
        return fail(new AppError('INVALID_PASSWORD', 'Invalid password', 401));
      }
    }

    await userRepo.update(userId, {
      isActive: true,
      deletionScheduledAt: null,
    });

    logSecurityEvent({
      event: SECURITY_EVENT.LoginSuccess,
      userId,
      email: user.email,
      metadata: { reason: 'account_reactivated' },
    });

    logger.info('ReactivateAccount', `User ${userId} reactivated account during grace period`);

    return succeed({
      message: 'Account riattivato con successo.',
    });
  };
}
