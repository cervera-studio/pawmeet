import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';

export interface RevokeAllOtherSessionsOutput {
  revokedCount: number;
}

interface Deps {
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createRevokeAllOtherSessions(deps: Deps) {
  return async (
    userId: string,
    refreshToken: string,
  ): Promise<Result<RevokeAllOtherSessionsOutput>> => {
    const { tokenRepo, authService } = deps;

    // Identify the current session's family via the caller's refresh token
    const tokenHash = await authService.hashRefreshToken(refreshToken);
    const currentToken = await tokenRepo.findRefreshToken(tokenHash);

    if (!currentToken || currentToken.userId !== userId) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 401));
    }

    const revokedCount = await tokenRepo.revokeAllOtherFamilies(userId, currentToken.familyId);

    logSecurityEvent({
      event: SECURITY_EVENT.AllOtherSessionsRevoked,
      userId,
      metadata: { revokedCount },
    });

    return succeed({ revokedCount });
  };
}
