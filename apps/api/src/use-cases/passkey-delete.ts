import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { OAuthAccountRepository } from '../ports/oauth-account-repository.js';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

interface Deps {
  passkeyRepo: PasskeyRepository;
  userRepo: UserRepository;
  oauthAccountRepo: OAuthAccountRepository;
}

export function createPasskeyDelete(deps: Deps) {
  return async (userId: string, passkeyId: string): Promise<Result<{ message: string }>> => {
    const { passkeyRepo, userRepo, oauthAccountRepo } = deps;

    // Ensure user has another auth method before deleting last passkey
    const passkeyCount = await passkeyRepo.countByUserId(userId);
    if (passkeyCount <= 1) {
      const user = await userRepo.findById(userId);
      const hasPassword = user?.passwordHash != null;
      const oauthLinks = await oauthAccountRepo.findByUserId(userId);

      if (!hasPassword && oauthLinks.length === 0) {
        return fail(
          new AppError('PASSKEY_LAST_AUTH_METHOD', ERROR_MESSAGES.PASSKEY_LAST_AUTH_METHOD, 400),
        );
      }
    }

    const deleted = await passkeyRepo.delete(passkeyId, userId);
    if (!deleted) {
      return fail(new AppError('PASSKEY_NOT_FOUND', ERROR_MESSAGES.PASSKEY_NOT_FOUND, 404));
    }

    logSecurityEvent({
      event: SECURITY_EVENT.AccountLinked,
      userId,
      metadata: { provider: 'passkey', action: 'deleted', passkeyId },
    });

    return succeed({ message: 'Passkey deleted' });
  };
}
