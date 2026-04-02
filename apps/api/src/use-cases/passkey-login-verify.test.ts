import { isFailure, isSuccess } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import {
  buildAuthService,
  buildTokenRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createPasskeyLoginVerify } from './passkey-login-verify.js';
import type { ChallengeStore } from './passkey-register-options.js';

vi.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: vi.fn().mockResolvedValue({
    verified: true,
    authenticationInfo: { newCounter: 10 },
  }),
}));

function buildCredential() {
  return {
    id: 'pk-1',
    userId: 'usr_1',
    credentialId: 'cred-1',
    publicKey: Buffer.from('key'),
    counter: 5,
    deviceType: 'multiDevice',
    backedUp: true,
    transports: ['internal'],
    friendlyName: 'My Passkey',
    createdAt: new Date(),
    lastUsedAt: null,
  };
}

function buildPasskeyRepo(overrides: Partial<PasskeyRepository> = {}): PasskeyRepository {
  return {
    findById: vi.fn(),
    findByCredentialId: vi.fn().mockResolvedValue(buildCredential()),
    findByUserId: vi.fn(),
    create: vi.fn(),
    updateCounter: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    countByUserId: vi.fn(),
    ...overrides,
  };
}

function buildChallengeStore(): ChallengeStore {
  return {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue('stored-challenge'),
    del: vi.fn().mockResolvedValue(undefined),
  };
}

function buildDeps() {
  return {
    userRepo: buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'usr_1', isActive: true })),
      update: vi.fn().mockResolvedValue(undefined),
    }),
    passkeyRepo: buildPasskeyRepo(),
    tokenRepo: buildTokenRepo({
      createRefreshToken: vi.fn().mockResolvedValue({ id: 'rt-1' }),
    }),
    authService: buildAuthService({
      generateTokenPair: vi
        .fn()
        .mockResolvedValue({ accessToken: 'access-tok', refreshToken: 'refresh-tok' }),
      hashRefreshToken: vi.fn().mockResolvedValue('hashed-refresh'),
    }),
    challengeStore: buildChallengeStore(),
  };
}

const mockResponse = {
  id: 'cred-1',
  rawId: 'raw',
  type: 'public-key',
  response: {},
  clientExtensionResults: {},
} as never;

describe('createPasskeyLoginVerify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authenticates user and returns tokens', async () => {
    const deps = buildDeps();
    const loginVerify = createPasskeyLoginVerify(deps);

    const result = await loginVerify(mockResponse);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.accessToken).toBe('access-tok');
    expect(result.data.refreshToken).toBe('refresh-tok');
    expect(result.data.user).toEqual({
      id: 'usr_1',
      email: 'mario@example.com',
      displayName: 'Mario Rossi',
    });
    expect(deps.passkeyRepo.updateCounter).toHaveBeenCalledWith('pk-1', 10);
    expect(deps.userRepo.update).toHaveBeenCalledWith('usr_1', {
      lastLoginAt: expect.any(Date),
    });
  });

  it('fails with 400 when credential not found', async () => {
    const deps = buildDeps();
    deps.passkeyRepo.findByCredentialId = vi.fn().mockResolvedValue(null);
    const loginVerify = createPasskeyLoginVerify(deps);

    const result = await loginVerify(mockResponse);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_NOT_FOUND');
    expect(result.error.status).toBe(400);
  });

  it('fails with 400 when verification throws', async () => {
    const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');
    (verifyAuthenticationResponse as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('bad'),
    );

    const deps = buildDeps();
    const loginVerify = createPasskeyLoginVerify(deps);

    const result = await loginVerify(mockResponse);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_VERIFICATION_FAILED');
  });

  it('fails with 400 when verification returns not verified', async () => {
    const { verifyAuthenticationResponse } = await import('@simplewebauthn/server');
    (verifyAuthenticationResponse as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      verified: false,
    });

    const deps = buildDeps();
    const loginVerify = createPasskeyLoginVerify(deps);

    const result = await loginVerify(mockResponse);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_VERIFICATION_FAILED');
  });

  it('fails with 401 when user account is inactive', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi.fn().mockResolvedValue(buildUser({ isActive: false }));
    const loginVerify = createPasskeyLoginVerify(deps);

    const result = await loginVerify(mockResponse);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(result.error.status).toBe(401);
  });

  it('fails with 401 when user not found', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi.fn().mockResolvedValue(null);
    const loginVerify = createPasskeyLoginVerify(deps);

    const result = await loginVerify(mockResponse);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(result.error.status).toBe(401);
  });
});
