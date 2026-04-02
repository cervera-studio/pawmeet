import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import { createPasskeyList } from './passkey-list.js';

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

describe('createPasskeyList', () => {
  it('returns empty array when user has no passkeys', async () => {
    const deps = { passkeyRepo: buildPasskeyRepo() };
    const passkeyList = createPasskeyList(deps);

    const result = await passkeyList('usr_1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual([]);
  });

  it('maps credential records to summaries', async () => {
    const credential = {
      id: 'pk-1',
      userId: 'usr_1',
      credentialId: 'cred-abc',
      publicKey: Buffer.from('key'),
      counter: 5,
      deviceType: 'singleDevice',
      backedUp: false,
      transports: ['usb'],
      friendlyName: 'YubiKey',
      createdAt: new Date('2026-03-01'),
      lastUsedAt: new Date('2026-03-15'),
    };
    const deps = {
      passkeyRepo: buildPasskeyRepo({
        findByUserId: vi.fn().mockResolvedValue([credential]),
      }),
    };
    const passkeyList = createPasskeyList(deps);

    const result = await passkeyList('usr_1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      id: 'pk-1',
      friendlyName: 'YubiKey',
      deviceType: 'singleDevice',
      backedUp: false,
      createdAt: new Date('2026-03-01'),
      lastUsedAt: new Date('2026-03-15'),
    });
    // Should not include sensitive fields
    expect(result.data[0]).not.toHaveProperty('publicKey');
    expect(result.data[0]).not.toHaveProperty('credentialId');
  });
});
