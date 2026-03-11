import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { SocialAuthVerifier } from '../ports/social-auth-verifier.js';
import {
  buildAuthService,
  buildTokenRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createSocialLogin } from './social-login.js';

function buildSocialAuthVerifier(overrides: Partial<SocialAuthVerifier> = {}): SocialAuthVerifier {
  return {
    verify: vi.fn().mockResolvedValue({
      email: 'social@example.com',
      providerUserId: 'provider-uid-1',
      displayName: 'Social User',
    }),
    ...overrides,
  };
}

function buildDeps(
  overrides: Partial<{
    userRepo: ReturnType<typeof buildUserRepo>;
    tokenRepo: ReturnType<typeof buildTokenRepo>;
    authService: ReturnType<typeof buildAuthService>;
    socialAuthVerifier: SocialAuthVerifier;
  }> = {},
) {
  return {
    userRepo: buildUserRepo(),
    tokenRepo: buildTokenRepo(),
    authService: buildAuthService(),
    socialAuthVerifier: buildSocialAuthVerifier(),
    ...overrides,
  };
}

const input = { provider: 'google' as const, idToken: 'valid-id-token' };

describe('createSocialLogin', () => {
  it('creates a new user when email not found', async () => {
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(
        buildUser({
          id: 'new-1',
          email: 'social@example.com',
          authProvider: 'google',
          emailVerified: true,
        }),
      ),
      update: vi
        .fn()
        .mockImplementation((_id, _data) =>
          Promise.resolve(
            buildUser({ id: 'new-1', email: 'social@example.com', emailVerified: true }),
          ),
        ),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.accessToken).toBe('access');
    expect(result.data.refreshToken).toBe('refresh');
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'social@example.com',
        authProvider: 'google',
        passwordHash: null,
      }),
    );
  });

  it('uses input displayName over provider displayName', async () => {
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockResolvedValue(buildUser({ displayName: 'Custom Name', emailVerified: true })),
      update: vi.fn().mockResolvedValue(buildUser({ emailVerified: true })),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    await socialLogin({ ...input, displayName: 'Custom Name' });

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Custom Name' }),
    );
  });

  it('falls back to email prefix when no displayName available', async () => {
    const socialAuthVerifier = buildSocialAuthVerifier({
      verify: vi.fn().mockResolvedValue({
        email: 'noname@example.com',
        providerUserId: 'uid-2',
        displayName: null,
      }),
    });
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(buildUser({ displayName: 'noname', emailVerified: true })),
      update: vi.fn().mockResolvedValue(buildUser({ emailVerified: true })),
    });
    const deps = buildDeps({ userRepo, socialAuthVerifier });
    const socialLogin = createSocialLogin(deps);

    await socialLogin(input);

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'noname' }),
    );
  });

  it('logs in existing active user', async () => {
    const existingUser = buildUser({
      email: 'social@example.com',
      authProvider: 'google',
      isActive: true,
      emailVerified: true,
    });
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(existingUser),
      update: vi.fn().mockResolvedValue(existingUser),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isSuccess(result)).toBe(true);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it('auto-verifies email for unverified users', async () => {
    const unverifiedUser = buildUser({
      email: 'social@example.com',
      authProvider: 'google',
      emailVerified: false,
    });
    const verifiedUser = buildUser({ ...unverifiedUser, emailVerified: true });
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(unverifiedUser),
      update: vi.fn().mockResolvedValue(verifiedUser),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    await socialLogin(input);

    expect(userRepo.update).toHaveBeenCalledWith(
      unverifiedUser.id,
      expect.objectContaining({ emailVerified: true }),
    );
  });

  it('fails with 401 when social token is invalid', async () => {
    const socialAuthVerifier = buildSocialAuthVerifier({
      verify: vi.fn().mockRejectedValue(new Error('Invalid token')),
    });
    const deps = buildDeps({ socialAuthVerifier });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(result.error.status).toBe(401);
  });

  it('fails with 403 when account is disabled', async () => {
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(buildUser({ isActive: false })),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_ACCOUNT_DISABLED');
    expect(result.error.status).toBe(403);
  });

  it('stores refresh token hash', async () => {
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(buildUser({ emailVerified: true })),
      update: vi.fn().mockResolvedValue(buildUser({ emailVerified: true })),
    });
    const tokenRepo = buildTokenRepo();
    const deps = buildDeps({ userRepo, tokenRepo });
    const socialLogin = createSocialLogin(deps);

    await socialLogin(input);

    expect(tokenRepo.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'hashed-refresh' }),
    );
  });

  it('updates lastLoginAt', async () => {
    const existingUser = buildUser({ emailVerified: true });
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(existingUser),
      update: vi.fn().mockResolvedValue(existingUser),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    await socialLogin(input);

    expect(userRepo.update).toHaveBeenCalledWith(
      existingUser.id,
      expect.objectContaining({ lastLoginAt: expect.any(Date) }),
    );
  });

  it('does not expose passwordHash in response', async () => {
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(buildUser({ emailVerified: true })),
      update: vi.fn().mockResolvedValue(buildUser({ emailVerified: true })),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect('passwordHash' in result.data.user).toBe(false);
  });
});
