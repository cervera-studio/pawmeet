import { TOKEN_TYPE } from '@pawmeet/db';
import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { generateOtp, PASSWORD_RESET_OTP_EXPIRY_MS } from '../lib/email.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
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

const MINIMUM_RESPONSE_MS = 500;
const MAX_JITTER_MS = 500;

export function createForgotPassword(deps: Deps) {
  return async (email: string): Promise<Result<ForgotPasswordOutput>> => {
    const { userRepo, tokenRepo, authService, emailService } = deps;
    const startTime = Date.now();

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
        .sendPasswordResetOtp(email, otp, user.locale)
        .catch((e) => logger.warn('ForgotPassword', 'Failed to send password reset OTP', e));
    }

    logSecurityEvent({ event: SECURITY_EVENT.PasswordResetRequested, email });

    // Constant-time delay + random jitter to prevent email enumeration via response timing
    const elapsed = Date.now() - startTime;
    const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
    const targetMs = MINIMUM_RESPONSE_MS + jitter;
    if (elapsed < targetMs) {
      await new Promise((resolve) => setTimeout(resolve, targetMs - elapsed));
    }

    return succeed({ message: "Se l'email esiste, riceverai un codice per il reset" });
  };
}
