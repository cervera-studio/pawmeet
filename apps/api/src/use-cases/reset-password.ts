import { TOKEN_TYPE } from '@dogwalk/db';
import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface ResetPasswordInput {
  email: string;
  code: string;
  password: string;
}

export interface ResetPasswordOutput {
  message: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
}

export function createResetPassword(deps: Deps) {
  return async (input: ResetPasswordInput): Promise<Result<ResetPasswordOutput>> => {
    const { userRepo, tokenRepo, authService } = deps;
    const { email, code, password } = input;

    const user = await userRepo.findByEmail(email);
    if (!user) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Codice non valido o scaduto', 400));
    }

    const codeHash = await authService.hashToken(code);
    const stored = await tokenRepo.findValidVerificationTokenByUser(
      user.id,
      codeHash,
      TOKEN_TYPE.PASSWORD_RESET,
    );

    if (!stored) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Codice non valido o scaduto', 400));
    }

    // Mark token as used
    await tokenRepo.markVerificationTokenUsed(stored.id);

    // Update user password
    const passwordHash = await authService.hashPassword(password);
    await userRepo.update(user.id, { passwordHash });

    // Revoke all refresh tokens for this user (force re-login)
    await tokenRepo.revokeAllUserRefreshTokens(user.id);

    return succeed({ message: 'Password reimpostata con successo' });
  };
}
