import type { SafeUser } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { SocialLoginInput } from '@pawmeet/validation';
import { sanitizeUser } from '../lib/sanitize.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { OAuthAccountRepository } from '../ports/oauth-account-repository.js';
import type { SocialAuthPayload, SocialAuthVerifier } from '../ports/social-auth-verifier.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  socialAuthVerifier: SocialAuthVerifier;
  oauthAccountRepo: OAuthAccountRepository;
}

export interface SocialLoginOutput {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSocialLogin(deps: Deps) {
  return async (input: SocialLoginInput): Promise<Result<SocialLoginOutput>> => {
    const { userRepo, tokenRepo, authService, socialAuthVerifier, oauthAccountRepo } = deps;
    const { provider, idToken, nonce } = input;

    // 1. Verify the social provider's ID token
    let payload: SocialAuthPayload;
    try {
      payload = await socialAuthVerifier.verify(provider, idToken, nonce);
    } catch {
      logSecurityEvent({
        event: SECURITY_EVENT.SocialLoginFailed,
        metadata: { provider, reason: 'invalid_token' },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid social token', 401));
    }

    if (!payload.providerUserId) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Missing provider user ID', 401));
    }

    // 2. Look up by (provider, providerUserId) — the canonical OAuth lookup
    const existingLink = await oauthAccountRepo.findByProviderUid(provider, payload.providerUserId);

    let user = existingLink ? await userRepo.findById(existingLink.userId) : null;

    if (user) {
      // Known linked account — check if active
      if (!user.isActive) {
        logSecurityEvent({
          event: SECURITY_EVENT.SocialLoginFailed,
          userId: user.id,
          email: payload.email ?? undefined,
          metadata: { provider, reason: 'account_disabled' },
        });
        return fail(new AppError('AUTH_ACCOUNT_DISABLED', 'Account disattivato', 403));
      }
    } else if (payload.email) {
      // 3. No link found — fall back to email lookup for potential account linking
      const existingUser = await userRepo.findByEmail(payload.email);

      if (existingUser) {
        if (!existingUser.isActive) {
          logSecurityEvent({
            event: SECURITY_EVENT.SocialLoginFailed,
            userId: existingUser.id,
            email: payload.email,
            metadata: { provider, reason: 'account_disabled' },
          });
          return fail(new AppError('AUTH_ACCOUNT_DISABLED', 'Account disattivato', 403));
        }

        // Auto-link only if BOTH sides have verified email
        if (!(existingUser.emailVerified && payload.emailVerified)) {
          logSecurityEvent({
            event: SECURITY_EVENT.SocialLoginFailed,
            userId: existingUser.id,
            email: payload.email,
            metadata: { provider, reason: 'email_not_verified_for_linking' },
          });
          return fail(
            new AppError(
              'AUTH_LINK_REQUIRES_VERIFICATION',
              'Verifica la tua email prima di collegare un provider social',
              409,
            ),
          );
        }

        // Safe to auto-link
        user = existingUser;
        await oauthAccountRepo.upsert({
          userId: user.id,
          provider,
          providerUserId: payload.providerUserId,
          providerEmail: payload.email,
        });

        logSecurityEvent({
          event: SECURITY_EVENT.SocialLoginSuccess,
          userId: user.id,
          email: payload.email,
          metadata: { provider, action: 'account_linked' },
        });
      }
    }

    if (!user) {
      // 4. No existing user — create new account
      const emailPrefix = payload.email?.split('@')[0] ?? 'utente';
      const name = input.displayName ?? payload.displayName ?? emailPrefix;
      user = await userRepo.create({
        email: payload.email ?? `${payload.providerUserId}@${provider}.oauth.local`,
        displayName: name,
        passwordHash: null,
        authProvider: provider,
      });

      // Create the oauth_accounts link
      await oauthAccountRepo.upsert({
        userId: user.id,
        provider,
        providerUserId: payload.providerUserId,
        providerEmail: payload.email,
      });
    }

    // Social providers verify email, so mark as verified (if we have an email)
    if (!user.emailVerified && payload.email && payload.emailVerified) {
      user = await userRepo.update(user.id, { emailVerified: true });
    }

    // Generate token pair
    const tokenPair = await authService.generateTokenPair(user.id);

    // Store refresh token with a new family
    const refreshTokenHash = await authService.hashRefreshToken(tokenPair.refreshToken);
    await tokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    // Update last login
    await userRepo.update(user.id, { lastLoginAt: new Date() });

    logSecurityEvent({
      event: SECURITY_EVENT.SocialLoginSuccess,
      userId: user.id,
      email: payload.email ?? undefined,
      metadata: { provider },
    });

    return succeed({
      user: sanitizeUser(user),
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    });
  };
}
