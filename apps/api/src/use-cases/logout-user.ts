import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
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

    return succeed({ message: 'Logout effettuato' });
  };
}
