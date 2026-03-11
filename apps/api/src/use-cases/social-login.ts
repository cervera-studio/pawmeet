import type { SafeUser } from '@dogwalk/types';
import type { SocialLoginInput } from '@dogwalk/validation';
import { type Result, AppError, fail, succeed } from '@dogwalk/types';
import type { AuthService } from '../ports/auth-service.js';
import type { SocialAuthPayload, SocialAuthVerifier } from '../ports/social-auth-verifier.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import { sanitizeUser } from '../lib/sanitize.js';

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  socialAuthVerifier: SocialAuthVerifier;
}

export interface SocialLoginOutput {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export function createSocialLogin(deps: Deps) {
  return async (input: SocialLoginInput): Promise<Result<SocialLoginOutput>> => {
    const { userRepo, tokenRepo, authService, socialAuthVerifier } = deps;
    const { provider, idToken } = input;

    // Verify the social provider's ID token
    let payload: SocialAuthPayload;
    try {
      payload = await socialAuthVerifier.verify(provider, idToken);
    } catch {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Token social non valido', 401));
    }

    // Find or create user
    let user = await userRepo.findByEmail(payload.email);

    if (user) {
      // Existing user — check if account is active
      if (!user.isActive) {
        return fail(new AppError('AUTH_ACCOUNT_DISABLED', 'Account disattivato', 403));
      }

      // If user registered with email but now logs in with social,
      // link the social provider (update authProvider)
      if (user.authProvider === 'email') {
        user = await userRepo.update(user.id, {});
      }
    } else {
      // New user — create with social provider
      const emailPrefix = payload.email.split('@')[0] ?? payload.email;
      const name = input.displayName ?? payload.displayName ?? emailPrefix;
      user = await userRepo.create({
        email: payload.email,
        displayName: name,
        passwordHash: null,
        authProvider: provider,
      });
    }

    // Social providers verify email, so mark as verified
    if (!user.emailVerified) {
      user = await userRepo.update(user.id, { emailVerified: true });
    }

    // Generate token pair
    const tokenPair = await authService.generateTokenPair(user.id);

    // Store refresh token
    const refreshTokenHash = await authService.hashRefreshToken(tokenPair.refreshToken);
    await tokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Update last login
    await userRepo.update(user.id, { lastLoginAt: new Date() });

    return succeed({
      user: sanitizeUser(user),
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    });
  };
}
