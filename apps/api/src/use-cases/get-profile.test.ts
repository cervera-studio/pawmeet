import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createGetProfile } from './get-profile.js';

describe('getProfile', () => {
  it('returns safe user without passwordHash on success', async () => {
    const user = buildUser();
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });
    const getProfile = createGetProfile({ userRepo });

    const result = await getProfile('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.user.email).toBe('mario@example.com');
    expect(result.data.user.displayName).toBe('Mario Rossi');
    expect(result.data.user).not.toHaveProperty('passwordHash');
  });

  it('fails with USER_NOT_FOUND when user does not exist', async () => {
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(null) });
    const getProfile = createGetProfile({ userRepo });

    const result = await getProfile('nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
