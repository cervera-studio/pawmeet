import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';

export interface RevokeSessionOutput {
  message: string;
}

interface Deps {
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createRevokeSession(deps: Deps) {
  return async (userId: string, sessionId: string): Promise<Result<RevokeSessionOutput>> => {
    const { tokenRepo } = deps;

    // Find all active sessions for the user and verify the target belongs to them
    const activeTokens = await tokenRepo.findActiveSessionsByUserId(userId);
    const target = activeTokens.find((t) => t.id === sessionId);

    if (!target) {
      return fail(new AppError('SESSION_NOT_FOUND', ERROR_MESSAGES.SESSION_NOT_FOUND, 404));
    }

    // Revoke the entire token family (all rotated tokens for that device)
    await tokenRepo.revokeTokenFamily(target.familyId);

    logSecurityEvent({
      event: SECURITY_EVENT.SessionRevoked,
      userId,
      metadata: { revokedSessionId: sessionId, deviceName: target.deviceName },
    });

    return succeed({ message: 'Session revoked' });
  };
}
