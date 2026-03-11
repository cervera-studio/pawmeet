import { TOKEN_TYPE } from '@dogwalk/db';
import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import { logger } from '@dogwalk/utils';
import { EMAIL_VERIFICATION_OTP_EXPIRY_MS, generateOtp } from '../lib/email.js';
import { type SafeUser, sanitizeUser } from '../lib/sanitize.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { AuthService } from '../ports/auth-service.js';
import type { EmailService } from '../ports/email-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterOutput {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

interface Deps {
  userRepo: UserRepository;
  tokenRepo: TokenRepository;
  authService: AuthService;
  emailService: EmailService;
}

export function createRegisterUser(deps: Deps) {
  return async (input: RegisterInput): Promise<Result<RegisterOutput>> => {
    const { userRepo, tokenRepo, authService, emailService } = deps;
    const { email, password, displayName } = input;

    // Check if email already exists
    const existing = await userRepo.findByEmail(email);
    if (existing) {
      return fail(new AppError('AUTH_EMAIL_TAKEN', 'Email già registrata', 409));
    }

    // Hash password and create user
    const passwordHash = await authService.hashPassword(password);
    const user = await userRepo.create({
      email,
      displayName,
      passwordHash,
      authProvider: 'email',
    });

    // Send verification OTP
    const otp = generateOtp();
    const otpHash = await authService.hashToken(otp);
    await tokenRepo.createVerificationToken({
      userId: user.id,
      tokenHash: otpHash,
      type: TOKEN_TYPE.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_OTP_EXPIRY_MS),
    });
    // Fire-and-forget: don't block registration on email delivery
    emailService
      .sendVerificationOtp(email, otp)
      .catch((e) => logger.warn('RegisterUser', 'Failed to send verification OTP', e));

    // Generate auth tokens
    const { accessToken, refreshToken } = await authService.generateTokenPair(user.id);

    // Store refresh token hash
    const refreshHash = await authService.hashRefreshToken(refreshToken);
    await tokenRepo.createRefreshToken({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Update last login
    await userRepo.update(user.id, { lastLoginAt: new Date() });

    logSecurityEvent({ event: SECURITY_EVENT.RegisterSuccess, userId: user.id, email });

    return succeed({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  };
}
