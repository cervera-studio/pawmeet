import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { RefreshTokenRecord } from '../ports/token-repository.js';
import { buildAuthService, buildTokenRepo } from '../test-utils/builders.js';
import { createRevokeAllOtherSessions } from './revoke-all-other-sessions.js';

const USER_ID = 'usr_1';

function buildRefreshTokenRecord(overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
  return {
    id: 'rt-1',
    userId: USER_ID,
    tokenHash: 'hash-1',
    familyId: 'family-a',
    deviceName: null,
    deviceOs: null,
    expiresAt: new Date('2027-01-01'),
    revoked: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('createRevokeAllOtherSessions', () => {
  it('revokes all other families and returns the count', async () => {
    const currentToken = buildRefreshTokenRecord({ familyId: 'family-current' });
    const revokeAllOtherFamilies = vi.fn().mockResolvedValue(3);

    const tokenRepo = buildTokenRepo({
      findRefreshToken: vi.fn().mockResolvedValue(currentToken),
      revokeAllOtherFamilies,
    });
    const authService = buildAuthService({
      hashRefreshToken: vi.fn().mockResolvedValue('hash-1'),
    });

    const revokeAll = createRevokeAllOtherSessions({ tokenRepo, authService });
    const result = await revokeAll(USER_ID, 'raw-refresh-token');

    expect(isSuccess(result)).toBe(true);
    if (!result.success) return;
    expect(result.data.revokedCount).toBe(3);
    expect(revokeAllOtherFamilies).toHaveBeenCalledWith(USER_ID, 'family-current');
  });

  it('fails if the refresh token is not found', async () => {
    const tokenRepo = buildTokenRepo({
      findRefreshToken: vi.fn().mockResolvedValue(null),
    });
    const authService = buildAuthService({
      hashRefreshToken: vi.fn().mockResolvedValue('hash-unknown'),
    });

    const revokeAll = createRevokeAllOtherSessions({ tokenRepo, authService });
    const result = await revokeAll(USER_ID, 'bad-token');

    expect(isFailure(result)).toBe(true);
  });

  it('fails if the refresh token belongs to another user', async () => {
    const otherToken = buildRefreshTokenRecord({ userId: 'usr_other' });
    const tokenRepo = buildTokenRepo({
      findRefreshToken: vi.fn().mockResolvedValue(otherToken),
    });
    const authService = buildAuthService({
      hashRefreshToken: vi.fn().mockResolvedValue('hash-1'),
    });

    const revokeAll = createRevokeAllOtherSessions({ tokenRepo, authService });
    const result = await revokeAll(USER_ID, 'raw-token');

    expect(isFailure(result)).toBe(true);
    if (result.success) return;
    expect(result.error.status).toBe(401);
  });
});
