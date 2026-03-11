import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../ports/auth-service.js';
import type { TokenRepository } from '../ports/token-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import { buildUser } from '../test-utils/builders.js';
import { createLoginUser } from './login-user.js';

function buildDeps(
  overrides: Partial<{
    userRepo: Partial<UserRepository>;
    tokenRepo: Partial<TokenRepository>;
    authService: Partial<AuthService>;
  }> = {},
) {
  const user = buildUser({
    id: 'usr_1',
    email: 'test@example.com',
    passwordHash: 'hashed_pw',
  });
  return {
    userRepo: {
      findByEmail: vi.fn().mockResolvedValue(user),
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
      markVerificationTokenUsed: vi.fn().mockResolvedValue(undefined),
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
      generateToken: vi.fn().mockReturnValue('token'),
      hashToken: vi.fn().mockResolvedValue('hashed'),
      hashRefreshToken: vi.fn().mockResolvedValue('hashed_refresh'),
      ...overrides.authService,
    } as AuthService,
  };
}

describe('createLoginUser', () => {
  const input = { email: 'test@example.com', password: 'Str0ng!Pass' };

  it('logs in successfully and returns tokens', async () => {
    const deps = buildDeps();
    const loginUser = createLoginUser(deps);

    const result = await loginUser(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.accessToken).toBe('access_tok');
    expect(result.data.refreshToken).toBe('refresh_tok');
    expect('passwordHash' in result.data.user).toBe(false);
  });

  it('fails with 401 when user not found', async () => {
    const deps = buildDeps({
      userRepo: { findByEmail: vi.fn().mockResolvedValue(null) },
    });
    const loginUser = createLoginUser(deps);

    const result = await loginUser(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(result.error.status).toBe(401);
  });

  it('fails with 401 when password is wrong', async () => {
    const deps = buildDeps({
      authService: { verifyPassword: vi.fn().mockResolvedValue(false) },
    });
    const loginUser = createLoginUser(deps);

    const result = await loginUser(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(result.error.status).toBe(401);
  });

  it('fails with 403 when account is inactive', async () => {
    const deps = buildDeps({
      userRepo: {
        findByEmail: vi.fn().mockResolvedValue(buildUser({ isActive: false })),
      },
    });
    const loginUser = createLoginUser(deps);

    const result = await loginUser(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_ACCOUNT_DISABLED');
    expect(result.error.status).toBe(403);
  });
});
