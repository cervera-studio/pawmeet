import { TOKEN_TYPE } from '@pawmeet/db';
import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthService,
  buildEmailService,
  buildTokenRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createForgotPassword } from './forgot-password.js';

vi.mock('../lib/email.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/email.js')>();
  return {
    ...original,
    generateOtp: vi.fn().mockReturnValue('789012'),
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

describe('createForgotPassword', () => {
  it('revokes old tokens, creates OTP, and sends email', async () => {
    const user = buildUser({ id: 'usr_1', email: 'test@example.com' });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
    });
    const forgotPassword = createForgotPassword(deps);

    const result = await forgotPassword('test@example.com');

    expect(isSuccess(result)).toBe(true);
    expect(deps.tokenRepo.revokeAllVerificationTokens).toHaveBeenCalledWith(
      'usr_1',
      TOKEN_TYPE.PASSWORD_RESET,
    );
    expect(deps.tokenRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_1',
        type: TOKEN_TYPE.PASSWORD_RESET,
      }),
    );
    expect(deps.emailService.sendPasswordResetOtp).toHaveBeenCalledWith(
      'test@example.com',
      '789012',
    );
  });

  it('returns success even when user not found (prevents email enumeration)', async () => {
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(null) },
    });
    const forgotPassword = createForgotPassword(deps);

    const result = await forgotPassword('nonexistent@example.com');

    expect(isSuccess(result)).toBe(true);
    expect(deps.tokenRepo.createVerificationToken).not.toHaveBeenCalled();
    expect(deps.emailService.sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it('hashes OTP before storing', async () => {
    const user = buildUser();
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
      authService: { hashToken: vi.fn().mockResolvedValue('hashed-otp') },
    });
    const forgotPassword = createForgotPassword(deps);

    await forgotPassword('test@example.com');

    expect(deps.authService.hashToken).toHaveBeenCalledWith('789012');
    expect(deps.tokenRepo.createVerificationToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hashed-otp' }),
    );
  });
});
