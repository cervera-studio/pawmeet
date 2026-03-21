import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { buildAuthService, buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createReactivateAccount } from './reactivate-account.js';

describe('createReactivateAccount', () => {
  const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  it('should reactivate a deactivated account within grace period', async () => {
    const user = buildUser({
      id: 'user-1',
      isActive: false,
      deletionScheduledAt: futureDate,
      passwordHash: 'hashed',
    });
    const userRepo = buildUserRepo({
      findByIdWithPassword: async () => user,
      update: async () => ({ ...user, isActive: true, deletionScheduledAt: null }),
    });
    const authService = buildAuthService({ verifyPassword: async () => true });

    const reactivate = createReactivateAccount({ userRepo, authService });
    const result = await reactivate('user-1', 'password123');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.message).toContain('riattivato');
    }
  });

  it('should fail if account is already active', async () => {
    const user = buildUser({ id: 'user-1', isActive: true });
    const userRepo = buildUserRepo({ findByIdWithPassword: async () => user });
    const authService = buildAuthService();

    const reactivate = createReactivateAccount({ userRepo, authService });
    const result = await reactivate('user-1', 'password123');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('ALREADY_ACTIVE');
    }
  });

  it('should fail if grace period has expired', async () => {
    const user = buildUser({
      id: 'user-1',
      isActive: false,
      deletionScheduledAt: pastDate,
      passwordHash: 'hashed',
    });
    const userRepo = buildUserRepo({ findByIdWithPassword: async () => user });
    const authService = buildAuthService();

    const reactivate = createReactivateAccount({ userRepo, authService });
    const result = await reactivate('user-1', 'password123');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('GRACE_PERIOD_EXPIRED');
    }
  });

  it('should fail with wrong password', async () => {
    const user = buildUser({
      id: 'user-1',
      isActive: false,
      deletionScheduledAt: futureDate,
      passwordHash: 'hashed',
    });
    const userRepo = buildUserRepo({ findByIdWithPassword: async () => user });
    const authService = buildAuthService({ verifyPassword: async () => false });

    const reactivate = createReactivateAccount({ userRepo, authService });
    const result = await reactivate('user-1', 'wrong');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('INVALID_PASSWORD');
    }
  });
});
