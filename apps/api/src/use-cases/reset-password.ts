import { TOKEN_TYPE } from '@pawmeet/db';
import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { checkOtpRateLimit, recordOtpAttempt, resetOtpAttempts } from '../lib/otp-rate-limit.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
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

    // Per-email OTP rate limiting to prevent brute-force
    const allowed = await checkOtpRateLimit(email);
    if (!allowed) {
      return fail(new AppError('AUTH_RATE_LIMITED', ERROR_MESSAGES.AUTH_RATE_LIMITED, 429));
    }

    const user = await userRepo.findByEmail(email);
    if (!user) {
      await recordOtpAttempt(email);
      logSecurityEvent({
        event: SECURITY_EVENT.PasswordResetFailed,
        email,
        metadata: { reason: 'user_not_found' },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid or expired code', 400));
    }

    const codeHash = await authService.hashToken(code);
    const stored = await tokenRepo.findValidVerificationTokenByUser(
      user.id,
      codeHash,
      TOKEN_TYPE.PASSWORD_RESET,
    );

    if (!stored) {
      await recordOtpAttempt(email);
      logSecurityEvent({
        event: SECURITY_EVENT.PasswordResetFailed,
        userId: user.id,
        email,
        metadata: { reason: 'invalid_code' },
      });
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid or expired code', 400));
    }

    // Atomically mark token as used — prevents race condition where two
    // concurrent requests both see the token as valid (usedAt IS NULL)
    const claimed = await tokenRepo.markVerificationTokenUsedAtomic(stored.id);
    if (!claimed) {
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid or expired code', 400));
    }

    // Update user password
    const passwordHash = await authService.hashPassword(password);
    await userRepo.update(user.id, { passwordHash });

    // Revoke all refresh tokens for this user (force re-login)
    await tokenRepo.revokeAllUserRefreshTokens(user.id);
    await resetOtpAttempts(email);

    logSecurityEvent({ event: SECURITY_EVENT.PasswordResetSuccess, userId: user.id, email });

    return succeed({ message: 'Password reimpostata con successo' });
  };
}
