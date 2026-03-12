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
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Token non valido', 401));
    }

    // Check the token hash exists and is not revoked
    const tokenHash = await authService.hashRefreshToken(refreshToken);
    const storedToken = await tokenRepo.findRefreshToken(tokenHash);

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      logSecurityEvent({
        event: SECURITY_EVENT.TokenRefreshFailed,
        userId: payload.sub,
        metadata: { reason: 'token_revoked_or_expired' },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Token non valido', 401));
    }

    // Revoke the old refresh token (rotation)
    await tokenRepo.revokeRefreshToken(storedToken.id);

    // Generate new token pair
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await authService.generateTokenPair(payload.sub);

    // Store new refresh token hash
    const newTokenHash = await authService.hashRefreshToken(newRefreshToken);
    await tokenRepo.createRefreshToken({
      userId: payload.sub,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    logSecurityEvent({ event: SECURITY_EVENT.TokenRefreshed, userId: payload.sub });

    return succeed({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  };
}
