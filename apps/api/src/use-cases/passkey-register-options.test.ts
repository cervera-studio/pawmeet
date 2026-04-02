import { WEBAUTHN_MAX_CREDENTIALS_PER_USER } from '@pawmeet/config';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import type { ChallengeStore } from './passkey-register-options.js';
import { createPasskeyRegisterOptions } from './passkey-register-options.js';

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn().mockResolvedValue({
    challenge: 'test-challenge',
    rp: { name: 'PawMeet', id: 'pawmeet.io' },
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
    countByUserId: vi.fn().mockResolvedValue(0),
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

function buildDeps() {
  return {
    userRepo: buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ id: 'usr_1' })),
    }),
    passkeyRepo: buildPasskeyRepo(),
    challengeStore: buildChallengeStore(),
  };
}

describe('createPasskeyRegisterOptions', () => {
  it('generates registration options and stores challenge', async () => {
    const deps = buildDeps();
    const registerOptions = createPasskeyRegisterOptions(deps);

    const result = await registerOptions('usr_1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveProperty('challenge', 'test-challenge');
    expect(deps.challengeStore.set).toHaveBeenCalledWith('usr_1', 'test-challenge');
  });

  it('fails with 404 when user not found', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi.fn().mockResolvedValue(null);
    const registerOptions = createPasskeyRegisterOptions(deps);

    const result = await registerOptions('usr_1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with 400 when passkey limit reached', async () => {
    const deps = buildDeps();
    deps.passkeyRepo.countByUserId = vi.fn().mockResolvedValue(WEBAUTHN_MAX_CREDENTIALS_PER_USER);
    const registerOptions = createPasskeyRegisterOptions(deps);

    const result = await registerOptions('usr_1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_LIMIT_REACHED');
    expect(result.error.status).toBe(400);
  });

  it('passes existing credentials as excludeCredentials', async () => {
    const { generateRegistrationOptions } = await import('@simplewebauthn/server');
    const deps = buildDeps();
    deps.passkeyRepo.findByUserId = vi
      .fn()
      .mockResolvedValue([{ credentialId: 'cred-1', transports: ['usb', 'ble'] }]);
    const registerOptions = createPasskeyRegisterOptions(deps);

    await registerOptions('usr_1');

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [{ id: 'cred-1', transports: ['usb', 'ble'] }],
      }),
    );
  });
});
