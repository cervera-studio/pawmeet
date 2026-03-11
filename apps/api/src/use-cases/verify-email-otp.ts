import { TOKEN_TYPE } from '@dogwalk/db';
import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface VerifyEmailOtpOutput {
  message: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createVerifyEmailOtp(deps: Deps) {
  return async (input: {
    email: string;
    code: string;
  }): Promise<Result<VerifyEmailOtpOutput>> => {
    const { userRepo, tokenRepo, authService } = deps;

    const user = await userRepo.findByEmail(input.email);
    if (!user) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Codice non valido o scaduto', 400));
    }

    if (user.emailVerified) {
      return succeed({ message: 'Email già verificata' });
    }

    const codeHash = await authService.hashToken(input.code);
    const stored = await tokenRepo.findValidVerificationTokenByUser(
      user.id,
      codeHash,
      TOKEN_TYPE.EMAIL_VERIFICATION,
    );

    if (!stored) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Codice non valido o scaduto', 400));
    }

    await tokenRepo.markVerificationTokenUsed(stored.id);
    await userRepo.update(user.id, { emailVerified: true });

    return succeed({ message: 'Email verificata con successo' });
  };
}
