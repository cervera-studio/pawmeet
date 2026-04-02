import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildAuthService, buildTokenRepo } from '../test-utils/builders.js';
import { createLogoutUser } from './logout-user.js';

function buildDeps() {
  return {
    tokenRepo: buildTokenRepo({
      revokeRefreshTokenByHash: vi.fn().mockResolvedValue(undefined),
    }),
    authService: buildAuthService({
      hashRefreshToken: vi.fn().mockResolvedValue('hashed-token'),
    }),
  };
}

describe('createLogoutUser', () => {
  it('hashes and revokes the refresh token', async () => {
    const deps = buildDeps();
    const logoutUser = createLogoutUser(deps);

    const result = await logoutUser('some-refresh-token');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Logged out');
    expect(deps.authService.hashRefreshToken).toHaveBeenCalledWith('some-refresh-token');
    expect(deps.tokenRepo.revokeRefreshTokenByHash).toHaveBeenCalledWith('hashed-token');
  });
});
