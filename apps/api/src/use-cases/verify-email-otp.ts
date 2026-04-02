import { TOKEN_TYPE } from '@pawmeet/db';
import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { checkOtpRateLimit, recordOtpAttempt, resetOtpAttempts } from '../lib/otp-rate-limit.js';
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
  return async (input: { email: string; code: string }): Promise<Result<VerifyEmailOtpOutput>> => {
    const { userRepo, tokenRepo, authService } = deps;

    // Per-email OTP rate limiting to prevent brute-force
    const allowed = await checkOtpRateLimit(input.email);
    if (!allowed) {
      return fail(new AppError('AUTH_RATE_LIMITED', ERROR_MESSAGES.AUTH_RATE_LIMITED, 429));
    }

    const user = await userRepo.findByEmail(input.email);
    if (!user) {
      await recordOtpAttempt(input.email);
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid or expired code', 400));
    }

    if (user.emailVerified) {
      return succeed({ message: 'Email already verified' });
    }

    const codeHash = await authService.hashToken(input.code);
    const stored = await tokenRepo.findValidVerificationTokenByUser(
      user.id,
      codeHash,
      TOKEN_TYPE.EMAIL_VERIFICATION,
    );

    if (!stored) {
      await recordOtpAttempt(input.email);
      return fail(new AppError('AUTH_INVALID_TOKEN', 'Invalid or expired code', 400));
    }

    await tokenRepo.markVerificationTokenUsed(stored.id);
    await userRepo.update(user.id, { emailVerified: true });
    await resetOtpAttempts(input.email);

    return succeed({ message: 'Email verified successfully' });
  };
}
