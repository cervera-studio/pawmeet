import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildAuthService, buildTokenRepo } from '../test-utils/builders.js';
import { createRefreshTokens } from './refresh-tokens.js';

function buildStoredToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rt-1',
    userId: 'usr_1',
    tokenHash: 'hashed-refresh',
    familyId: 'family-1',
    deviceName: 'iPhone',
    deviceOs: 'iOS',
    expiresAt: new Date('2027-01-01'),
    revoked: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildDeps() {
  return {
    tokenRepo: buildTokenRepo({
      findRefreshToken: vi.fn().mockResolvedValue(buildStoredToken()),
      revokeRefreshTokenAtomic: vi.fn().mockResolvedValue(true),
      revokeTokenFamily: vi.fn().mockResolvedValue(undefined),
      createRefreshToken: vi.fn().mockResolvedValue({ id: 'rt-2' }),
    }),
    authService: buildAuthService({
      verifyRefreshToken: vi.fn().mockResolvedValue({ sub: 'usr_1' }),
      hashRefreshToken: vi.fn().mockResolvedValue('hashed-refresh'),
      generateTokenPair: vi
        .fn()
        .mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    }),
  };
}

describe('createRefreshTokens', () => {
  it('rotates tokens successfully', async () => {
    const deps = buildDeps();
    const refreshTokens = createRefreshTokens(deps);

    const result = await refreshTokens('old-refresh-token');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.accessToken).toBe('new-access');
    expect(result.data.refreshToken).toBe('new-refresh');
    expect(deps.tokenRepo.revokeRefreshTokenAtomic).toHaveBeenCalledWith('rt-1');
    expect(deps.tokenRepo.createRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'usr_1', familyId: 'family-1' }),
    );
  });

  it('fails with 401 when JWT is invalid', async () => {
    const deps = buildDeps();
    deps.authService.verifyRefreshToken = vi.fn().mockRejectedValue(new Error('invalid'));
    const refreshTokens = createRefreshTokens(deps);

    const result = await refreshTokens('bad-token');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(result.error.status).toBe(401);
  });

  it('fails with 401 when token not found in DB', async () => {
    const deps = buildDeps();
    deps.tokenRepo.findRefreshToken = vi.fn().mockResolvedValue(null);
    const refreshTokens = createRefreshTokens(deps);

    const result = await refreshTokens('old-refresh-token');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('fails with 401 when token is expired', async () => {
    const deps = buildDeps();
    deps.tokenRepo.findRefreshToken = vi
      .fn()
      .mockResolvedValue(buildStoredToken({ expiresAt: new Date('2020-01-01') }));
    const refreshTokens = createRefreshTokens(deps);

    const result = await refreshTokens('old-refresh-token');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('revokes entire token family on reuse (token already revoked)', async () => {
    const deps = buildDeps();
    deps.tokenRepo.findRefreshToken = vi
      .fn()
      .mockResolvedValue(buildStoredToken({ revoked: true }));
    const refreshTokens = createRefreshTokens(deps);

    const result = await refreshTokens('old-refresh-token');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(deps.tokenRepo.revokeTokenFamily).toHaveBeenCalledWith('family-1');
  });

  it('revokes entire token family on race condition (atomic claim fails)', async () => {
    const deps = buildDeps();
    deps.tokenRepo.revokeRefreshTokenAtomic = vi.fn().mockResolvedValue(false);
    const refreshTokens = createRefreshTokens(deps);

    const result = await refreshTokens('old-refresh-token');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AUTH_INVALID_TOKEN');
    expect(deps.tokenRepo.revokeTokenFamily).toHaveBeenCalledWith('family-1');
  });
});
