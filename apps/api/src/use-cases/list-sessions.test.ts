import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { RefreshTokenRecord } from '../ports/token-repository.js';
import { buildAuthService, buildTokenRepo } from '../test-utils/builders.js';
import { createListSessions } from './list-sessions.js';

const USER_ID = 'usr_1';
const OTHER_USER_ID = 'usr_other';
const FAMILY_A = 'family-a';
const FAMILY_B = 'family-b';

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

describe('createListSessions', () => {
  it('returns active sessions and marks the current one', async () => {
    const currentToken = buildRefreshTokenRecord({ id: 'rt-1', familyId: FAMILY_A });
    const otherToken = buildRefreshTokenRecord({
      id: 'rt-2',
      familyId: FAMILY_B,
      deviceName: 'Pixel 9',
      deviceOs: 'Android',
    });

    const tokenRepo = buildTokenRepo({
      findRefreshToken: vi.fn().mockResolvedValue(currentToken),
      findActiveSessionsByUserId: vi.fn().mockResolvedValue([currentToken, otherToken]),
    });
    const authService = buildAuthService({
      hashRefreshToken: vi.fn().mockResolvedValue('hash-1'),
    });

    const listSessions = createListSessions({ tokenRepo, authService });
    const result = await listSessions(USER_ID, 'raw-refresh-token');

    expect(isSuccess(result)).toBe(true);
    if (!result.success) return;

    expect(result.data.sessions).toHaveLength(2);

    const current = result.data.sessions.find((s) => s.current);
    expect(current?.id).toBe('rt-1');
    expect(current?.deviceName).toBe('iPhone 15');

    const other = result.data.sessions.find((s) => !s.current);
    expect(other?.id).toBe('rt-2');
    expect(other?.deviceName).toBe('Pixel 9');
  });

  it('fails if the refresh token does not belong to the user', async () => {
    const tokenRepo = buildTokenRepo({
      findRefreshToken: vi
        .fn()
        .mockResolvedValue(buildRefreshTokenRecord({ userId: OTHER_USER_ID })),
    });
    const authService = buildAuthService({
      hashRefreshToken: vi.fn().mockResolvedValue('hash-1'),
    });

    const listSessions = createListSessions({ tokenRepo, authService });
    const result = await listSessions(USER_ID, 'raw-refresh-token');

    expect(isFailure(result)).toBe(true);
    if (result.success) return;
    expect(result.error.status).toBe(401);
  });

  it('fails if the refresh token is not found', async () => {
    const tokenRepo = buildTokenRepo({
      findRefreshToken: vi.fn().mockResolvedValue(null),
    });
    const authService = buildAuthService({
      hashRefreshToken: vi.fn().mockResolvedValue('hash-unknown'),
    });

    const listSessions = createListSessions({ tokenRepo, authService });
    const result = await listSessions(USER_ID, 'bad-token');

    expect(isFailure(result)).toBe(true);
  });
});
