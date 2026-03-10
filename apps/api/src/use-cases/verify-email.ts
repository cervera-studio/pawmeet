import { TOKEN_TYPE } from '@dogwalk/db';
import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface VerifyEmailOutput {
  message: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createVerifyEmail(deps: Deps) {
  return async (token: string): Promise<Result<VerifyEmailOutput>> => {
    const { userRepo, tokenRepo, authService } = deps;

    const tokenHash = await authService.hashToken(token);

    // Find valid, unused verification token
    const stored = await tokenRepo.findValidVerificationToken(
      tokenHash,
      TOKEN_TYPE.EMAIL_VERIFICATION,
    );

    if (!stored) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Token non valido o scaduto', 400));
    }

    // Mark token as used
    await tokenRepo.markVerificationTokenUsed(stored.id);

    // Mark user email as verified
    await userRepo.update(stored.userId, { emailVerified: true });

    return succeed({ message: 'Email verificata con successo' });
  };
}
