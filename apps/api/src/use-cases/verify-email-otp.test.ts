import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthService,
  buildTokenRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createVerifyEmailOtp } from './verify-email-otp.js';

function buildDeps(
  overrides: Partial<{
    userRepo: Parameters<typeof buildUserRepo>[0];
    tokenRepo: Parameters<typeof buildTokenRepo>[0];
    authService: Parameters<typeof buildAuthService>[0];
  }> = {},
) {
  return {
    userRepo: buildUserRepo(overrides.userRepo),
    tokenRepo: buildTokenRepo(overrides.tokenRepo),
    authService: buildAuthService(overrides.authService),
  };
}

describe('createVerifyEmailOtp', () => {
  const input = { email: 'test@example.com', code: '123456' };

  it('verifies email successfully with valid OTP', async () => {
    const user = buildUser({ id: 'usr_1', emailVerified: false });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
      tokenRepo: {
        findValidVerificationTokenByUser: vi.fn().mockResolvedValue({
          id: 'vt-1',
          userId: 'usr_1',
          tokenHash: 'hashed-token',
          type: 'email_verification',
          expiresAt: new Date('2027-01-01'),
          usedAt: null,
          createdAt: new Date(),
        }),
      },
    });
    const verifyEmailOtp = createVerifyEmailOtp(deps);

    const result = await verifyEmailOtp(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Email verified successfully');
    expect(deps.tokenRepo.markVerificationTokenUsed).toHaveBeenCalledWith('vt-1');
    expect(deps.userRepo.update).toHaveBeenCalledWith('usr_1', { emailVerified: true });
  });

  it('returns success when email is already verified', async () => {
    const user = buildUser({ emailVerified: true });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
    });
    const verifyEmailOtp = createVerifyEmailOtp(deps);

    const result = await verifyEmailOtp(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Email already verified');
    expect(deps.tokenRepo.findValidVerificationTokenByUser).not.toHaveBeenCalled();
  });

  it('fails with 400 when user not found', async () => {
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(null) },
    });
    const verifyEmailOtp = createVerifyEmailOtp(deps);

    const result = await verifyEmailOtp(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(result.error.status).toBe(400);
  });

  it('fails with 400 when OTP is invalid or expired', async () => {
    const user = buildUser({ emailVerified: false });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
      tokenRepo: { findValidVerificationTokenByUser: vi.fn().mockResolvedValue(null) },
    });
    const verifyEmailOtp = createVerifyEmailOtp(deps);

    const result = await verifyEmailOtp(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(result.error.status).toBe(400);
  });

  it('hashes the OTP code before lookup', async () => {
    const user = buildUser({ emailVerified: false });
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
      tokenRepo: { findValidVerificationTokenByUser: vi.fn().mockResolvedValue(null) },
      authService: { hashToken: vi.fn().mockResolvedValue('hashed-code') },
    });
    const verifyEmailOtp = createVerifyEmailOtp(deps);

    await verifyEmailOtp(input);

    expect(deps.authService.hashToken).toHaveBeenCalledWith('123456');
  });
});
