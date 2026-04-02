import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import type { ChallengeStore } from './passkey-register-options.js';
import { createPasskeyLoginOptions } from './passkey-login-options.js';

vi.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: vi.fn().mockResolvedValue({
    challenge: 'login-challenge',
    rpId: 'pawmeet.io',
  }),
}));

function buildPasskeyRepo(overrides: Partial<PasskeyRepository> = {}): PasskeyRepository {
  return {
    findById: vi.fn(),
    findByCredentialId: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    updateCounter: vi.fn(),
    delete: vi.fn(),
    countByUserId: vi.fn(),
    ...overrides,
  };
}

function buildChallengeStore(): ChallengeStore {
  return {
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(undefined),
  };
}

describe('createPasskeyLoginOptions', () => {
  it('generates options without email (discoverable credential flow)', async () => {
    const deps = {
      userRepo: buildUserRepo(),
      passkeyRepo: buildPasskeyRepo(),
      challengeStore: buildChallengeStore(),
    };
    const loginOptions = createPasskeyLoginOptions(deps);

    const result = await loginOptions();

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveProperty('challenge', 'login-challenge');
    expect(deps.challengeStore.set).toHaveBeenCalledWith(
      'login:login-challenge',
      'login-challenge',
    );
  });

  it('includes allowCredentials when email is provided', async () => {
    const { generateAuthenticationOptions } = await import('@simplewebauthn/server');
    const deps = {
      userRepo: buildUserRepo({
        findByEmail: vi.fn().mockResolvedValue(buildUser({ id: 'usr_1' })),
      }),
      passkeyRepo: buildPasskeyRepo({
        findByUserId: vi
          .fn()
          .mockResolvedValue([{ credentialId: 'cred-1', transports: ['internal'] }]),
      }),
      challengeStore: buildChallengeStore(),
    };
    const loginOptions = createPasskeyLoginOptions(deps);

    await loginOptions('test@example.com');

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ id: 'cred-1', transports: ['internal'] }],
      }),
    );
  });

  it('omits allowCredentials when email user not found', async () => {
    const { generateAuthenticationOptions } = await import('@simplewebauthn/server');
    const deps = {
      userRepo: buildUserRepo({
        findByEmail: vi.fn().mockResolvedValue(null),
      }),
      passkeyRepo: buildPasskeyRepo(),
      challengeStore: buildChallengeStore(),
    };
    const loginOptions = createPasskeyLoginOptions(deps);

    await loginOptions('unknown@example.com');

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: undefined,
      }),
    );
  });
});
