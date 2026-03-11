import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import { type SafeUser, sanitizeUser } from '../lib/sanitize.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

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
    const { email, password } = input;

    // Find user by email
    const user = await userRepo.findByEmail(email);
    if (!user || !user.passwordHash) {
      logSecurityEvent({
        event: SECURITY_EVENT.LoginFailed,
        email,
        metadata: { reason: 'user_not_found' },
      });
      return fail(new AppError('AUTH_INVALID_CREDENTIALS', 'Credenziali non valide', 401));
    }

    // Verify password
    const valid = await authService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      logSecurityEvent({ event: SECURITY_EVENT.LoginFailed, userId: user.id, email });
      return fail(new AppError('AUTH_INVALID_CREDENTIALS', 'Credenziali non valide', 401));
    }

    // Check if account is active
    if (!user.isActive) {
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

    logSecurityEvent({ event: SECURITY_EVENT.LoginSuccess, userId: user.id, email });

    return succeed({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  };
}
