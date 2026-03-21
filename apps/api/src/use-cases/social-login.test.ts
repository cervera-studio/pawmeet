import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { OAuthAccountRepository } from '../ports/oauth-account-repository.js';
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
      emailVerified: true,
      providerUserId: 'provider-uid-1',
      displayName: 'Social User',
    }),
    ...overrides,
  };
}

function buildOAuthAccountRepo(
  overrides: Partial<OAuthAccountRepository> = {},
): OAuthAccountRepository {
  return {
    findByProviderUid: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({
      id: 'oauth-1',
      userId: 'user-1',
      provider: 'google',
      providerUserId: 'provider-uid-1',
      providerEmail: 'social@example.com',
      linkedAt: new Date(),
    }),
    deleteByUserAndProvider: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildDeps(
  overrides: Partial<{
    userRepo: ReturnType<typeof buildUserRepo>;
    tokenRepo: ReturnType<typeof buildTokenRepo>;
    authService: ReturnType<typeof buildAuthService>;
    socialAuthVerifier: SocialAuthVerifier;
    oauthAccountRepo: OAuthAccountRepository;
  }> = {},
) {
  return {
    userRepo: buildUserRepo(),
    tokenRepo: buildTokenRepo(),
    authService: buildAuthService(),
    socialAuthVerifier: buildSocialAuthVerifier(),
    oauthAccountRepo: buildOAuthAccountRepo(),
    ...overrides,
  };
}

const input = { provider: 'google' as const, idToken: 'valid-id-token' };

describe('createSocialLogin', () => {
  it('creates a new user when no link and no email match found', async () => {
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
    const oauthAccountRepo = buildOAuthAccountRepo();
    const deps = buildDeps({ userRepo, oauthAccountRepo });
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
    expect(oauthAccountRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        providerUserId: 'provider-uid-1',
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
        emailVerified: true,
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

  it('logs in existing linked user via provider UID lookup', async () => {
    const existingUser = buildUser({
      id: 'linked-user-1',
      email: 'social@example.com',
      authProvider: 'google',
      isActive: true,
      emailVerified: true,
    });
    const oauthAccountRepo = buildOAuthAccountRepo({
      findByProviderUid: vi.fn().mockResolvedValue({
        id: 'oauth-1',
        userId: 'linked-user-1',
        provider: 'google',
        providerUserId: 'provider-uid-1',
        providerEmail: 'social@example.com',
        linkedAt: new Date(),
      }),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(existingUser),
      update: vi.fn().mockResolvedValue(existingUser),
    });
    const deps = buildDeps({ userRepo, oauthAccountRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isSuccess(result)).toBe(true);
    expect(userRepo.create).not.toHaveBeenCalled();
    expect(userRepo.findById).toHaveBeenCalledWith('linked-user-1');
  });

  it('auto-links when existing email user has verified email', async () => {
    const existingUser = buildUser({
      email: 'social@example.com',
      authProvider: 'email',
      emailVerified: true,
    });
    const oauthAccountRepo = buildOAuthAccountRepo();
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(existingUser),
      update: vi.fn().mockResolvedValue(existingUser),
    });
    const deps = buildDeps({ userRepo, oauthAccountRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isSuccess(result)).toBe(true);
    expect(oauthAccountRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: existingUser.id,
        provider: 'google',
        providerUserId: 'provider-uid-1',
      }),
    );
  });

  it('rejects linking when existing user email is not verified', async () => {
    const unverifiedUser = buildUser({
      email: 'social@example.com',
      authProvider: 'email',
      emailVerified: false,
    });
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(unverifiedUser),
    });
    const deps = buildDeps({ userRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_LINK_REQUIRES_VERIFICATION');
    expect(result.error.status).toBe(409);
  });

  it('rejects linking when provider email is not verified', async () => {
    const existingUser = buildUser({
      email: 'social@example.com',
      authProvider: 'email',
      emailVerified: true,
    });
    const socialAuthVerifier = buildSocialAuthVerifier({
      verify: vi.fn().mockResolvedValue({
        email: 'social@example.com',
        emailVerified: false,
        providerUserId: 'provider-uid-1',
        displayName: 'Social User',
      }),
    });
    const userRepo = buildUserRepo({
      findByEmail: vi.fn().mockResolvedValue(existingUser),
    });
    const deps = buildDeps({ userRepo, socialAuthVerifier });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_LINK_REQUIRES_VERIFICATION');
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

  it('fails with 403 when linked account is disabled', async () => {
    const disabledUser = buildUser({ isActive: false });
    const oauthAccountRepo = buildOAuthAccountRepo({
      findByProviderUid: vi.fn().mockResolvedValue({
        id: 'oauth-1',
        userId: disabledUser.id,
        provider: 'google',
        providerUserId: 'provider-uid-1',
        providerEmail: 'social@example.com',
        linkedAt: new Date(),
      }),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(disabledUser),
    });
    const deps = buildDeps({ userRepo, oauthAccountRepo });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin(input);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_ACCOUNT_DISABLED');
    expect(result.error.status).toBe(403);
  });

  it('fails with 403 when email-matched account is disabled', async () => {
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
    const oauthAccountRepo = buildOAuthAccountRepo({
      findByProviderUid: vi.fn().mockResolvedValue({
        id: 'oauth-1',
        userId: existingUser.id,
        provider: 'google',
        providerUserId: 'provider-uid-1',
        providerEmail: 'social@example.com',
        linkedAt: new Date(),
      }),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(existingUser),
      update: vi.fn().mockResolvedValue(existingUser),
    });
    const deps = buildDeps({ userRepo, oauthAccountRepo });
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

  it('handles Apple re-login without email (lookup by providerUserId)', async () => {
    const existingUser = buildUser({
      id: 'apple-user-1',
      email: 'apple@example.com',
      authProvider: 'apple',
      emailVerified: true,
    });
    const socialAuthVerifier = buildSocialAuthVerifier({
      verify: vi.fn().mockResolvedValue({
        email: null,
        emailVerified: false,
        providerUserId: 'apple-sub-123',
        displayName: null,
      }),
    });
    const oauthAccountRepo = buildOAuthAccountRepo({
      findByProviderUid: vi.fn().mockResolvedValue({
        id: 'oauth-apple-1',
        userId: 'apple-user-1',
        provider: 'apple',
        providerUserId: 'apple-sub-123',
        providerEmail: 'apple@example.com',
        linkedAt: new Date(),
      }),
    });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(existingUser),
      update: vi.fn().mockResolvedValue(existingUser),
    });
    const deps = buildDeps({ userRepo, oauthAccountRepo, socialAuthVerifier });
    const socialLogin = createSocialLogin(deps);

    const result = await socialLogin({
      provider: 'apple',
      idToken: 'valid-apple-token',
    });

    expect(isSuccess(result)).toBe(true);
    expect(userRepo.findById).toHaveBeenCalledWith('apple-user-1');
    expect(userRepo.findByEmail).not.toHaveBeenCalled();
  });
});
