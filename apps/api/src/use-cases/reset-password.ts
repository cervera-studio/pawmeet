import { TOKEN_TYPE } from '@dogwalk/db';
import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface ResetPasswordInput {
  token: string;
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
    const { token, password } = input;

    const tokenHash = await authService.hashToken(token);

    // Find valid, unused reset token
    const stored = await tokenRepo.findValidVerificationToken(
      tokenHash,
      TOKEN_TYPE.PASSWORD_RESET,
    );

    if (!stored) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Token non valido o scaduto', 400));
    }

    // Mark token as used
    await tokenRepo.markVerificationTokenUsed(stored.id);

    // Update user password
    const passwordHash = await authService.hashPassword(password);
    await userRepo.update(stored.userId, { passwordHash });

    // Revoke all refresh tokens for this user (force re-login)
    await tokenRepo.revokeAllUserRefreshTokens(stored.userId);

    return succeed({ message: 'Password reimpostata con successo' });
  };
}
