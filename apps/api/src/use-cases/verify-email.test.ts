import { isFailure, isSuccess } from '@dogwalk/types';
import type { User } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository, VerificationTokenRecord } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import { createVerifyEmail } from './verify-email.js';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_1',
    email: 'test@example.com',
    displayName: 'Test User',
    passwordHash: 'hashed',
    authProvider: 'email',
    avatarUrl: null,
    latitude: null,
    longitude: null,
    locationUpdatedAt: null,
    searchRadiusKm: 10,
    emailVerified: false,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildVerificationToken(overrides: Partial<VerificationTokenRecord> = {}): VerificationTokenRecord {
  return {
    id: 'vt_1',
    userId: 'usr_1',
    tokenHash: 'hashed_token',
    type: 'email_verification',
    expiresAt: new Date(Date.now() + 86400000),
    usedAt: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function buildDeps(overrides: Partial<{
  userRepo: Partial<UserRepository>;
  tokenRepo: Partial<TokenRepository>;
  authService: Partial<AuthService>;
}> = {}) {
  const user = buildUser();
  return {
    userRepo: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(user),
      findByIds: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(buildUser({ emailVerified: true })),
      findNearby: vi.fn().mockResolvedValue([]),
      ...overrides.userRepo,
    } as UserRepository,
    tokenRepo: {
      createRefreshToken: vi.fn().mockResolvedValue({ id: 'rt_1' }),
      findRefreshToken: vi.fn().mockResolvedValue(null),
      revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
      revokeRefreshTokenByHash: vi.fn().mockResolvedValue(undefined),
      revokeAllUserRefreshTokens: vi.fn().mockResolvedValue(undefined),
      createVerificationToken: vi.fn().mockResolvedValue({ id: 'vt_1' }),
      findValidVerificationToken: vi.fn().mockResolvedValue(buildVerificationToken()),
      markVerificationTokenUsed: vi.fn().mockResolvedValue(undefined),
      ...overrides.tokenRepo,
    } as TokenRepository,
    authService: {
      hashPassword: vi.fn().mockResolvedValue('hashed'),
      verifyPassword: vi.fn().mockResolvedValue(true),
      generateTokenPair: vi.fn().mockResolvedValue({ accessToken: '', refreshToken: '' }),
      verifyRefreshToken: vi.fn().mockResolvedValue({ sub: 'usr_1' }),
      generateToken: vi.fn().mockReturnValue('token'),
      hashToken: vi.fn().mockResolvedValue('hashed_token'),
      hashRefreshToken: vi.fn().mockResolvedValue('hashed_refresh'),
      ...overrides.authService,
    } as AuthService,
  };
}

describe('createVerifyEmail', () => {
  it('verifies email successfully', async () => {
    const deps = buildDeps();
    const verifyEmail = createVerifyEmail(deps);

    const result = await verifyEmail('raw_token_123');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toContain('verificata');
    expect(deps.tokenRepo.markVerificationTokenUsed).toHaveBeenCalledWith('vt_1');
    expect(deps.userRepo.update).toHaveBeenCalledWith('usr_1', { emailVerified: true });
  });

  it('fails with 400 when token is invalid or expired', async () => {
    const deps = buildDeps({
      tokenRepo: { findValidVerificationToken: vi.fn().mockResolvedValue(null) },
    });
    const verifyEmail = createVerifyEmail(deps);

    const result = await verifyEmail('bad_token');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(result.error.status).toBe(400);
  });
});
