import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { accountLockout, MAX_FAILED_ATTEMPTS } from '../lib/account-lockout.js';
import { type SafeUser, sanitizeUser } from '../lib/sanitize.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

/**
 * Pre-hashed bcrypt value used for constant-time comparison when a user is
 * not found, preventing timing-based email enumeration attacks.
 */
const DUMMY_HASH = '$2b$12$LJ3m4ys3Lf3Xf3Xf3Xf3XeXf3Xf3Xf3Xf3Xf3Xf3Xf3Xf3Xf3X';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createLoginUser(deps: Deps) {
  return async (input: LoginInput): Promise<Result<LoginOutput>> => {
    const { userRepo, tokenRepo, authService } = deps;
    const { password } = input;
    const email = input.email.toLowerCase().trim();

    // Find user by email
    const user = await userRepo.findByEmail(email);

    if (!user?.passwordHash) {
      // Constant-time: run bcrypt even when user doesn't exist to prevent timing attacks
      await authService.verifyPassword(password, DUMMY_HASH);
      logger.warn('LoginUser', 'Login failed: user not found');

      logSecurityEvent({
        event: SECURITY_EVENT.LoginFailed,
        email,
        metadata: { reason: 'user_not_found' },
      });
      return fail(new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401));
    }

    // Check account lockout before verifying password
    if (await accountLockout.isLocked(user.id)) {
      logger.warn('LoginUser', 'Login failed: account locked', { userId: user.id });
      logSecurityEvent({
        event: SECURITY_EVENT.AccountLocked,
        userId: user.id,
        email,
      });
      return fail(
        new AppError('AUTH_ACCOUNT_LOCKED', 'Troppi tentativi. Riprova tra 15 minuti.', 429),
      );
    }

    // Verify password
    const valid = await authService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      logger.warn('LoginUser', 'Login failed: invalid password', { userId: user.id });
      const attempts = await accountLockout.recordFailedAttempt(user.id);
      logSecurityEvent({
        event: SECURITY_EVENT.LoginFailed,
        userId: user.id,
        email,
        metadata: { attempts },
      });
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        logSecurityEvent({
          event: SECURITY_EVENT.AccountLocked,
          userId: user.id,
          email,
          metadata: { attempts },
        });
      }
      return fail(new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401));
    }

    // Reset failed attempts on successful login
    await accountLockout.resetAttempts(user.id);

    // Check if account is active
    if (!user.isActive) {
      logger.warn('LoginUser', 'Login failed: account disabled', { userId: user.id });
      logSecurityEvent({
        event: SECURITY_EVENT.LoginFailed,
        userId: user.id,
        email,
        metadata: { reason: 'account_disabled' },
      });
      return fail(new AppError('AUTH_ACCOUNT_DISABLED', 'Account disattivato', 403));
    }

    // Generate tokens
    const { accessToken, refreshToken } = await authService.generateTokenPair(user.id);

    // Store refresh token hash
    const tokenHash = await authService.hashRefreshToken(refreshToken);
    await tokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Update last login
    await userRepo.update(user.id, { lastLoginAt: new Date() });

    logger.info('LoginUser', 'Login successful', { userId: user.id });

    logSecurityEvent({ event: SECURITY_EVENT.LoginSuccess, userId: user.id, email });

    return succeed({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  };
}
