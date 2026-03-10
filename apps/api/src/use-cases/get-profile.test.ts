import type { User } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../ports/index.js';
import { createGetProfile } from './get-profile.js';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    passwordHash: '$2b$12$secret-hash',
    authProvider: 'email',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    locationUpdatedAt: new Date('2026-03-01'),
    searchRadiusKm: 10,
    emailVerified: true,
    pushToken: null,
    notificationPrefs: { matches: true, messages: true, reminders: true },
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findNearby: vi.fn(),
    updatePushToken: vi.fn(),
    findPushToken: vi.fn(),
    ...overrides,
  };
}

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
