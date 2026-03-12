import { TOKEN_TYPE } from '@pawmeet/db';
import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import { EMAIL_VERIFICATION_OTP_EXPIRY_MS, generateOtp } from '../lib/email.js';
import type { AuthService } from '../ports/auth-service.js';
import type { EmailService } from '../ports/email-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface ResendVerificationOutput {
  message: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  emailService: EmailService;
}

export function createResendVerification(deps: Deps) {
  return async (email: string): Promise<Result<ResendVerificationOutput>> => {
    const { userRepo, tokenRepo, authService, emailService } = deps;

    const user = await userRepo.findByEmail(email);

    // Always return success to avoid email enumeration
    if (!user || user.emailVerified) {
      return succeed({ message: "Se l'email esiste, riceverai un codice di verifica" });
    }

    // Revoke any existing verification tokens
    await tokenRepo.revokeAllVerificationTokens(user.id, TOKEN_TYPE.EMAIL_VERIFICATION);

    // Generate and store new OTP
    const otp = generateOtp();
    const otpHash = await authService.hashToken(otp);
    await tokenRepo.createVerificationToken({
      userId: user.id,
      tokenHash: otpHash,
      type: TOKEN_TYPE.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_OTP_EXPIRY_MS),
    });

    await emailService.sendVerificationOtp(email, otp);

    return succeed({ message: "Se l'email esiste, riceverai un codice di verifica" });
  };
}
