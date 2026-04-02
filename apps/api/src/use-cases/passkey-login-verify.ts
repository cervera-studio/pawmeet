import { WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { REFRESH_TOKEN_TTL_MS } from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { ChallengeStore } from './passkey-register-options.js';

interface Deps {
  userRepo: UserRepository;
  passkeyRepo: PasskeyRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  challengeStore: ChallengeStore;
}

export function createPasskeyLoginVerify(deps: Deps) {
  return async (
    response: AuthenticationResponseJSON,
  ): Promise<
    Result<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; displayName: string | null };
    }>
  > => {
    const { userRepo, passkeyRepo, tokenRepo, authService, challengeStore } = deps;

    const credential = await passkeyRepo.findByCredentialId(response.id);
    if (!credential) {
      return fail(new AppError('PASSKEY_NOT_FOUND', ERROR_MESSAGES.PASSKEY_NOT_FOUND, 400));
    }

    let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: async (challenge) => {
          const stored = await challengeStore.get(`login:${challenge}`);
          if (stored) {
            await challengeStore.del(`login:${challenge}`);
            return true;
          }
          return false;
        },
        expectedOrigin: WEBAUTHN_ORIGIN,
        expectedRPID: [WEBAUTHN_RP_ID],
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: credential.counter,
          transports: (credential.transports ?? []) as AuthenticatorTransportFuture[],
        },
      });
    } catch {
      return fail(
        new AppError(
          'PASSKEY_VERIFICATION_FAILED',
          ERROR_MESSAGES.PASSKEY_VERIFICATION_FAILED,
          400,
        ),
      );
    }

    if (!verification.verified) {
      return fail(
        new AppError(
          'PASSKEY_VERIFICATION_FAILED',
          ERROR_MESSAGES.PASSKEY_VERIFICATION_FAILED,
          400,
        ),
      );
    }

    // Update counter for replay protection
    await passkeyRepo.updateCounter(credential.id, verification.authenticationInfo.newCounter);

    const user = await userRepo.findById(credential.userId);
    if (!user?.isActive) {
      return fail(
        new AppError('AUTH_INVALID_CREDENTIALS', ERROR_MESSAGES.AUTH_ACCOUNT_DISABLED, 401),
      );
    }

    // Generate tokens (same as email+password login)
    const { accessToken, refreshToken } = await authService.generateTokenPair(user.id);
    const tokenHash = await authService.hashRefreshToken(refreshToken);
    await tokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      deviceName: 'Passkey',
    });

    await userRepo.update(user.id, { lastLoginAt: new Date() });

    logSecurityEvent({
      event: SECURITY_EVENT.LoginSuccess,
      userId: user.id,
      metadata: { method: 'passkey' },
    });

    return succeed({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  };
}
