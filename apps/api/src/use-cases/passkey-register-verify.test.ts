import { isFailure, isSuccess } from '@pawmeet/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import type { ChallengeStore } from './passkey-register-options.js';
import { createPasskeyRegisterVerify } from './passkey-register-verify.js';

vi.mock('@simplewebauthn/server', () => ({
  verifyRegistrationResponse: vi.fn().mockResolvedValue({
    verified: true,
    registrationInfo: {
      credential: {
        id: 'cred-new',
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 0,
        transports: ['internal'],
      },
      credentialDeviceType: 'multiDevice',
      credentialBackedUp: true,
    },
  }),
}));

function buildPasskeyRepo(overrides: Partial<PasskeyRepository> = {}): PasskeyRepository {
  return {
    findById: vi.fn(),
    findByCredentialId: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: 'pk-new',
      friendlyName: 'My Passkey',
    }),
    updateCounter: vi.fn(),
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

const mockInput = {
  response: { id: 'resp-id', rawId: 'raw', type: 'public-key', response: {} } as never,
  friendlyName: 'My Passkey',
};

describe('createPasskeyRegisterVerify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies registration and stores credential', async () => {
    const deps = { passkeyRepo: buildPasskeyRepo(), challengeStore: buildChallengeStore() };
    const registerVerify = createPasskeyRegisterVerify(deps);

    const result = await registerVerify('usr_1', mockInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('pk-new');
    expect(result.data.friendlyName).toBe('My Passkey');
    expect(deps.challengeStore.del).toHaveBeenCalledWith('usr_1');
    expect(deps.passkeyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr_1',
        credentialId: 'cred-new',
        deviceType: 'multiDevice',
        backedUp: true,
        friendlyName: 'My Passkey',
      }),
    );
  });

  it('fails with 400 when challenge expired (not found)', async () => {
    const challengeStore = buildChallengeStore();
    challengeStore.get = vi.fn().mockResolvedValue(null);
    const deps = { passkeyRepo: buildPasskeyRepo(), challengeStore };
    const registerVerify = createPasskeyRegisterVerify(deps);

    const result = await registerVerify('usr_1', mockInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_CHALLENGE_EXPIRED');
    expect(result.error.status).toBe(400);
  });

  it('fails with 400 when verification throws', async () => {
    const { verifyRegistrationResponse } = await import('@simplewebauthn/server');
    (verifyRegistrationResponse as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('bad attestation'),
    );

    const deps = { passkeyRepo: buildPasskeyRepo(), challengeStore: buildChallengeStore() };
    const registerVerify = createPasskeyRegisterVerify(deps);

    const result = await registerVerify('usr_1', mockInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_VERIFICATION_FAILED');
  });

  it('fails with 400 when verification returns not verified', async () => {
    const { verifyRegistrationResponse } = await import('@simplewebauthn/server');
    (verifyRegistrationResponse as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      verified: false,
      registrationInfo: null,
    });

    const deps = { passkeyRepo: buildPasskeyRepo(), challengeStore: buildChallengeStore() };
    const registerVerify = createPasskeyRegisterVerify(deps);

    const result = await registerVerify('usr_1', mockInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_VERIFICATION_FAILED');
  });
});
