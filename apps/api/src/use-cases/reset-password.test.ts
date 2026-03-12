import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthService,
  buildTokenRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createResetPassword } from './reset-password.js';

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

describe('createResetPassword', () => {
  const input = { email: 'test@example.com', code: '123456', password: 'NewStr0ng!Pass' };

  it('resets password successfully with valid OTP', async () => {
    const user = buildUser({ id: 'usr_1' });
    const deps = buildDeps({
      userRepo: {
        findByEmail: vi.fn().mockResolvedValue(user),
        update: vi.fn().mockResolvedValue(user),
      },
      tokenRepo: {
        findValidVerificationTokenByUser: vi.fn().mockResolvedValue({
          id: 'vt-1',
          userId: 'usr_1',
          tokenHash: 'hashed',
          type: 'password_reset',
          expiresAt: new Date('2027-01-01'),
          usedAt: null,
          createdAt: new Date(),
        }),
      },
      authService: {
        hashPassword: vi.fn().mockResolvedValue('new-hashed-pw'),
      },
    });
    const resetPassword = createResetPassword(deps);

    const result = await resetPassword(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Password reimpostata con successo');
    expect(deps.tokenRepo.markVerificationTokenUsed).toHaveBeenCalledWith('vt-1');
    expect(deps.userRepo.update).toHaveBeenCalledWith('usr_1', { passwordHash: 'new-hashed-pw' });
    expect(deps.tokenRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith('usr_1');
  });

  it('fails with 400 when user not found', async () => {
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(null) },
    });
    const resetPassword = createResetPassword(deps);

    const result = await resetPassword(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(result.error.status).toBe(400);
  });

  it('fails with 400 when OTP is invalid or expired', async () => {
    const user = buildUser();
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
      tokenRepo: { findValidVerificationTokenByUser: vi.fn().mockResolvedValue(null) },
    });
    const resetPassword = createResetPassword(deps);

    const result = await resetPassword(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('revokes all refresh tokens after reset (force re-login)', async () => {
    const user = buildUser({ id: 'usr_1' });
    const deps = buildDeps({
      userRepo: {
        findByEmail: vi.fn().mockResolvedValue(user),
        update: vi.fn().mockResolvedValue(user),
      },
      tokenRepo: {
        findValidVerificationTokenByUser: vi.fn().mockResolvedValue({
          id: 'vt-1',
          userId: 'usr_1',
          tokenHash: 'hashed',
          type: 'password_reset',
          expiresAt: new Date('2027-01-01'),
          usedAt: null,
          createdAt: new Date(),
        }),
      },
    });
    const resetPassword = createResetPassword(deps);

    await resetPassword(input);

    expect(deps.tokenRepo.revokeAllUserRefreshTokens).toHaveBeenCalledWith('usr_1');
  });

  it('hashes the OTP code before lookup', async () => {
    const user = buildUser();
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(user) },
      tokenRepo: { findValidVerificationTokenByUser: vi.fn().mockResolvedValue(null) },
      authService: { hashToken: vi.fn().mockResolvedValue('hashed-code') },
    });
    const resetPassword = createResetPassword(deps);

    await resetPassword(input);

    expect(deps.authService.hashToken).toHaveBeenCalledWith('123456');
  });
});
