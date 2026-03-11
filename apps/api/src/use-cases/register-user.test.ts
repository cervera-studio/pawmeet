import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../ports/auth-service.js';
import type { EmailService } from '../ports/email-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import { buildUser } from '../test-utils/builders.js';
import { createRegisterUser } from './register-user.js';

vi.mock('../lib/email.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/email.js')>();
  return {
    ...original,
    generateOtp: vi.fn().mockReturnValue('123456'),
  };
});

function buildDeps(
  overrides: Partial<{
    userRepo: Partial<UserRepository>;
    tokenRepo: Partial<TokenRepository>;
    authService: Partial<AuthService>;
    emailService: Partial<EmailService>;
  }> = {},
) {
  const user = buildUser({
    id: 'usr_1',
    email: 'test@example.com',
    passwordHash: 'hashed_pw',
    emailVerified: false,
  });
  return {
    userRepo: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(user),
      findByIds: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(user),
      findNearby: vi.fn().mockResolvedValue([]),
      updatePushToken: vi.fn().mockResolvedValue(undefined),
      findPushToken: vi.fn().mockResolvedValue(null),
      ...overrides.userRepo,
    } as UserRepository,
    tokenRepo: {
      createRefreshToken: vi.fn().mockResolvedValue({ id: 'rt_1' }),
      findRefreshToken: vi.fn().mockResolvedValue(null),
      revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
      revokeRefreshTokenByHash: vi.fn().mockResolvedValue(undefined),
      revokeAllUserRefreshTokens: vi.fn().mockResolvedValue(undefined),
      createVerificationToken: vi.fn().mockResolvedValue({ id: 'vt_1' }),
      findValidVerificationToken: vi.fn().mockResolvedValue(null),
      findValidVerificationTokenByUser: vi.fn().mockResolvedValue(null),
      markVerificationTokenUsed: vi.fn().mockResolvedValue(undefined),
      revokeAllVerificationTokens: vi.fn().mockResolvedValue(undefined),
      ...overrides.tokenRepo,
    } as TokenRepository,
    authService: {
      hashPassword: vi.fn().mockResolvedValue('hashed_pw'),
      verifyPassword: vi.fn().mockResolvedValue(true),
      generateTokenPair: vi.fn().mockResolvedValue({
        accessToken: 'access_tok',
        refreshToken: 'refresh_tok',
      }),
      verifyRefreshToken: vi.fn().mockResolvedValue({ sub: 'usr_1' }),
      generateToken: vi.fn().mockReturnValue('verification_token'),
      hashToken: vi.fn().mockResolvedValue('hashed_verification'),
      hashRefreshToken: vi.fn().mockResolvedValue('hashed_refresh'),
      ...overrides.authService,
    } as AuthService,
    emailService: {
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
      sendVerificationOtp: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      ...overrides.emailService,
    } as EmailService,
  };
}

describe('createRegisterUser', () => {
  const input = { email: 'new@example.com', password: 'Str0ng!Pass', displayName: 'New User' };

  it('registers a new user and returns tokens', async () => {
    const deps = buildDeps();
    const registerUser = createRegisterUser(deps);

    const result = await registerUser(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.accessToken).toBe('access_tok');
    expect(result.data.refreshToken).toBe('refresh_tok');
    expect(result.data.user.email).toBe('test@example.com');
  });

  it('returns sanitized user without passwordHash', async () => {
    const deps = buildDeps();
    const registerUser = createRegisterUser(deps);

    const result = await registerUser(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect('passwordHash' in result.data.user).toBe(false);
  });

  it('fails with 409 when email already exists', async () => {
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(buildUser()) },
    });
    const registerUser = createRegisterUser(deps);

    const result = await registerUser(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_EMAIL_TAKEN');
    expect(result.error.status).toBe(409);
  });

  it('sends a verification OTP email', async () => {
    const deps = buildDeps();
    const registerUser = createRegisterUser(deps);

    await registerUser(input);

    expect(deps.emailService.sendVerificationOtp).toHaveBeenCalledWith('new@example.com', '123456');
  });
});
