import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';

export interface RefreshOutput {
  accessToken: string;
  refreshToken: string;
}

interface Deps {
  tokenRepo: TokenRepository;
  authService: AuthService;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createRefreshTokens(deps: Deps) {
  return async (refreshToken: string): Promise<Result<RefreshOutput>> => {
    const { tokenRepo, authService } = deps;

    // Verify the JWT refresh token
    let payload: { sub: string };
    try {
      payload = await authService.verifyRefreshToken(refreshToken);
    } catch {
      logSecurityEvent({
        event: SECURITY_EVENT.TokenRefreshFailed,
        metadata: { reason: 'invalid_jwt' },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 401));
    }

    // Check the token hash exists and is not revoked
    const tokenHash = await authService.hashRefreshToken(refreshToken);
    const storedToken = await tokenRepo.findRefreshToken(tokenHash);

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logSecurityEvent({
        event: SECURITY_EVENT.TokenRefreshFailed,
        userId: payload.sub,
        metadata: { reason: 'token_not_found_or_expired' },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 401));
    }

    // Token family reuse detection: if token is already revoked,
    // an attacker may have stolen and used it — revoke the entire family
    if (storedToken.revoked) {
      await tokenRepo.revokeTokenFamily(storedToken.familyId);
      logSecurityEvent({
        event: SECURITY_EVENT.TokenRefreshFailed,
        userId: payload.sub,
        metadata: { reason: 'token_reuse_detected', familyId: storedToken.familyId },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 401));
    }

    // Atomically revoke the old refresh token (rotation) — prevents race condition
    // where two concurrent refreshes both see the token as not revoked
    const claimed = await tokenRepo.revokeRefreshTokenAtomic(storedToken.id);
    if (!claimed) {
      // Another request already claimed this token — treat as reuse
      await tokenRepo.revokeTokenFamily(storedToken.familyId);
      logSecurityEvent({
        event: SECURITY_EVENT.TokenRefreshFailed,
        userId: payload.sub,
        metadata: { reason: 'token_reuse_race', familyId: storedToken.familyId },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 401));
    }

    // Generate new token pair
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await authService.generateTokenPair(payload.sub);

    // Store new refresh token hash — inherit the same familyId
    const newTokenHash = await authService.hashRefreshToken(newRefreshToken);
    await tokenRepo.createRefreshToken({
      userId: payload.sub,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      familyId: storedToken.familyId,
      deviceName: storedToken.deviceName,
      deviceOs: storedToken.deviceOs,
    });

    logSecurityEvent({ event: SECURITY_EVENT.TokenRefreshed, userId: payload.sub });

    return succeed({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  };
}
