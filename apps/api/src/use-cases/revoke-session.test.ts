import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { RefreshTokenRecord } from '../ports/token-repository.js';
import { buildAuthService, buildTokenRepo } from '../test-utils/builders.js';
import { createRevokeSession } from './revoke-session.js';

const USER_ID = 'usr_1';
const FAMILY_A = 'family-a';

function buildRefreshTokenRecord(overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
  return {
    id: 'rt-1',
    userId: USER_ID,
    tokenHash: 'hash-1',
    familyId: FAMILY_A,
    deviceName: 'iPhone 15',
    deviceOs: 'iOS',
    expiresAt: new Date('2027-01-01'),
    revoked: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('createRevokeSession', () => {
  it('revokes the target session by revoking its token family', async () => {
    const target = buildRefreshTokenRecord({ id: 'rt-target', familyId: 'family-target' });
    const revokeTokenFamily = vi.fn().mockResolvedValue(undefined);

    const tokenRepo = buildTokenRepo({
      findActiveSessionsByUserId: vi.fn().mockResolvedValue([target]),
      revokeTokenFamily,
    });
    const authService = buildAuthService();

    const revokeSession = createRevokeSession({ tokenRepo, authService });
    const result = await revokeSession(USER_ID, 'rt-target');

    expect(isSuccess(result)).toBe(true);
    expect(revokeTokenFamily).toHaveBeenCalledWith('family-target');
  });

  it('fails if the session is not found among active sessions', async () => {
    const tokenRepo = buildTokenRepo({
      findActiveSessionsByUserId: vi.fn().mockResolvedValue([]),
    });
    const authService = buildAuthService();

    const revokeSession = createRevokeSession({ tokenRepo, authService });
    const result = await revokeSession(USER_ID, 'rt-nonexistent');

    expect(isFailure(result)).toBe(true);
    if (result.success) return;
    expect(result.error.status).toBe(404);
  });

  it('prevents revoking sessions belonging to another user', async () => {
    const tokenRepo = buildTokenRepo({
      // findActiveSessionsByUserId is called with USER_ID, so it won't find other user's tokens
      findActiveSessionsByUserId: vi.fn().mockResolvedValue([]),
    });
    const authService = buildAuthService();

    const revokeSession = createRevokeSession({ tokenRepo, authService });
    const result = await revokeSession(USER_ID, 'rt-other');

    expect(isFailure(result)).toBe(true);
  });
});
