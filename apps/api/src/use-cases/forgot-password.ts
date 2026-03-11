import { TOKEN_TYPE } from '@dogwalk/db';
import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { generateOtp, PASSWORD_RESET_OTP_EXPIRY_MS } from '../lib/email.js';
import type { AuthService } from '../ports/auth-service.js';
import type { EmailService } from '../ports/email-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface ForgotPasswordOutput {
  message: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  emailService: EmailService;
}

export function createForgotPassword(deps: Deps) {
  return async (email: string): Promise<Result<ForgotPasswordOutput>> => {
    const { userRepo, tokenRepo, authService, emailService } = deps;

    // Always return success to prevent email enumeration
    const user = await userRepo.findByEmail(email);

    if (user) {
      // Revoke any existing password reset tokens
      await tokenRepo.revokeAllVerificationTokens(user.id, TOKEN_TYPE.PASSWORD_RESET);

      const otp = generateOtp();
      const otpHash = await authService.hashToken(otp);

      await tokenRepo.createVerificationToken({
        userId: user.id,
        tokenHash: otpHash,
        type: TOKEN_TYPE.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_OTP_EXPIRY_MS),
      });

      // Fire-and-forget
      emailService
        .sendPasswordResetOtp(email, otp)
        .catch((e) => logger.warn('ForgotPassword', 'Failed to send password reset OTP', e));
    }

    return succeed({ message: "Se l'email esiste, riceverai un codice per il reset" });
  };
}
