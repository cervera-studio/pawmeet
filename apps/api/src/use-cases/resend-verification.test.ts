import { TOKEN_TYPE } from '@dogwalk/db';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthService,
  buildEmailService,
  buildTokenRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createResendVerification } from './resend-verification.js';

vi.mock('../lib/email.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/email.js')>();
  return {
    ...original,
    generateOtp: vi.fn().mockReturnValue('654321'),
  };
});

function buildDeps(
  overrides: Partial<{
    userRepo: Parameters<typeof buildUserRepo>[0];
    tokenRepo: Parameters<typeof buildTokenRepo>[0];
    authService: Parameters<typeof buildAuthService>[0];
    emailService: Parameters<typeof buildEmailService>[0];
  }> = {},
) {
  return {
    userRepo: buildUserRepo(overrides.userRepo),
    tokenRepo: buildTokenRepo(overrides.tokenRepo),
    authService: buildAuthService(overrides.authService),
    emailService: buildEmailService(overrides.emailService),
  };
}

describe('createResendVerification', () => {
  it('revokes old tokens and sends new OTP', async () => {
    const user = buildUser({ id: 'usr_1', email: 'test@example.com', emailVerified: false });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
    });
    const resend = createResendVerification(deps);

    const result = await resend('test@example.com');

    expect(isSuccess(result)).toBe(true);
    expect(deps.tokenRepo.revokeAllVerificationTokens).toHaveBeenCalledWith(
      'usr_1',
      TOKEN_TYPE.EMAIL_VERIFICATION,
    );
    expect(deps.tokenRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_1',
        type: TOKEN_TYPE.EMAIL_VERIFICATION,
      }),
    );
    expect(deps.emailService.sendVerificationOtp).toHaveBeenCalledWith(
      'test@example.com',
      '654321',
    );
  });

  it('returns success even when user not found (prevents email enumeration)', async () => {
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(null) },
    });
    const resend = createResendVerification(deps);

    const result = await resend('nonexistent@example.com');

    expect(isSuccess(result)).toBe(true);
    expect(deps.tokenRepo.revokeAllVerificationTokens).not.toHaveBeenCalled();
    expect(deps.emailService.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('returns success when email is already verified', async () => {
    const user = buildUser({ emailVerified: true });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
    });
    const resend = createResendVerification(deps);

    const result = await resend('verified@example.com');

    expect(isSuccess(result)).toBe(true);
    expect(deps.tokenRepo.revokeAllVerificationTokens).not.toHaveBeenCalled();
    expect(deps.emailService.sendVerificationOtp).not.toHaveBeenCalled();
  });

  it('hashes the OTP before storing', async () => {
    const user = buildUser({ emailVerified: false });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
      authService: { hashToken: vi.fn().mockResolvedValue('hashed-otp') },
    });
    const resend = createResendVerification(deps);

    await resend('test@example.com');

    expect(deps.authService.hashToken).toHaveBeenCalledWith('654321');
    expect(deps.tokenRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hashed-otp' }),
    );
  });
});
