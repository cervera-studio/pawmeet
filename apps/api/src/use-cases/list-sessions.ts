import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  deviceOs: string | null;
  createdAt: Date;
  current: boolean;
}

export interface ListSessionsOutput {
  sessions: SessionInfo[];
}

interface Deps {
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createListSessions(deps: Deps) {
  return async (userId: string, refreshToken: string): Promise<Result<ListSessionsOutput>> => {
    const { tokenRepo, authService } = deps;

    // Hash the caller's refresh token to find the current session's family
    const tokenHash = await authService.hashRefreshToken(refreshToken);
    const currentToken = await tokenRepo.findRefreshToken(tokenHash);

    if (!currentToken || currentToken.userId !== userId) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid token', 401));
    }

    const currentFamilyId = currentToken.familyId;

    // Get all active (non-revoked, non-expired) sessions
    const activeTokens = await tokenRepo.findActiveSessionsByUserId(userId);

    const sessions: SessionInfo[] = activeTokens.map((token) => ({
      id: token.id,
      deviceName: token.deviceName,
      deviceOs: token.deviceOs,
      createdAt: token.createdAt,
      current: token.familyId === currentFamilyId,
    }));

    return succeed({ sessions });
  };
}
