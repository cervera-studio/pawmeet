import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { OAuthAccountRepository } from '../ports/oauth-account-repository.js';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createPasskeyDelete } from './passkey-delete.js';

function buildPasskeyRepo(overrides: Partial<PasskeyRepository> = {}): PasskeyRepository {
  return {
    findById: vi.fn(),
    findByCredentialId: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    updateCounter: vi.fn(),
    delete: vi.fn().mockResolvedValue(true),
    countByUserId: vi.fn().mockResolvedValue(2),
    ...overrides,
  };
}

function buildOAuthAccountRepo(
  overrides: Partial<OAuthAccountRepository> = {},
): OAuthAccountRepository {
  return {
    findByProviderUid: vi.fn(),
    findByUserId: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
    deleteByUserAndProvider: vi.fn(),
    ...overrides,
  };
}

function buildDeps() {
  return {
    passkeyRepo: buildPasskeyRepo(),
    userRepo: buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ passwordHash: 'hashed' })),
    }),
    oauthAccountRepo: buildOAuthAccountRepo(),
  };
}

describe('createPasskeyDelete', () => {
  it('deletes a passkey when user has multiple', async () => {
    const deps = buildDeps();
    const passkeyDelete = createPasskeyDelete(deps);

    const result = await passkeyDelete('usr_1', 'pk-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Passkey deleted');
    expect(deps.passkeyRepo.delete).toHaveBeenCalledWith('pk-1', 'usr_1');
  });

  it('allows deleting last passkey when user has a password', async () => {
    const deps = buildDeps();
    deps.passkeyRepo.countByUserId = vi.fn().mockResolvedValue(1);
    const passkeyDelete = createPasskeyDelete(deps);

    const result = await passkeyDelete('usr_1', 'pk-1');

    expect(isSuccess(result)).toBe(true);
  });

  it('allows deleting last passkey when user has OAuth links', async () => {
    const deps = buildDeps();
    deps.passkeyRepo.countByUserId = vi.fn().mockResolvedValue(1);
    deps.userRepo.findById = vi.fn().mockResolvedValue(buildUser({ passwordHash: null }));
    deps.oauthAccountRepo.findByUserId = vi.fn().mockResolvedValue([
      {
        id: 'oauth-1',
        provider: 'google',
        userId: 'usr_1',
        providerUserId: 'g-1',
        providerEmail: null,
        linkedAt: new Date(),
      },
    ]);
    const passkeyDelete = createPasskeyDelete(deps);

    const result = await passkeyDelete('usr_1', 'pk-1');

    expect(isSuccess(result)).toBe(true);
  });

  it('fails with 400 when deleting last passkey with no alternative auth', async () => {
    const deps = buildDeps();
    deps.passkeyRepo.countByUserId = vi.fn().mockResolvedValue(1);
    deps.userRepo.findById = vi.fn().mockResolvedValue(buildUser({ passwordHash: null }));
    const passkeyDelete = createPasskeyDelete(deps);

    const result = await passkeyDelete('usr_1', 'pk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_LAST_AUTH_METHOD');
    expect(result.error.status).toBe(400);
  });

  it('fails with 404 when passkey does not exist', async () => {
    const deps = buildDeps();
    deps.passkeyRepo.delete = vi.fn().mockResolvedValue(false);
    const passkeyDelete = createPasskeyDelete(deps);

    const result = await passkeyDelete('usr_1', 'pk-nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('PASSKEY_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
