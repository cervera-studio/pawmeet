import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';

export interface LogoutOutput {
  message: string;
}

interface Deps {
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createLogoutUser(deps: Deps) {
  return async (refreshToken: string): Promise<Result<LogoutOutput>> => {
    const { tokenRepo, authService } = deps;

    // Revoke the refresh token
    const tokenHash = await authService.hashRefreshToken(refreshToken);
    await tokenRepo.revokeRefreshTokenByHash(tokenHash);

    logSecurityEvent({ event: SECURITY_EVENT.Logout });

    return succeed({ message: 'Logged out' });
  };
}
