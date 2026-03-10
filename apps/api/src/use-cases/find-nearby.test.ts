import { DEFAULT_SEARCH_RADIUS_KM } from '@dogwalk/config';
import type { User } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { NearbyUser, UserRepository } from '../ports/index.js';
import { createFindNearby } from './find-nearby.js';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    passwordHash: '$2b$12$hash',
    authProvider: 'email',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    locationUpdatedAt: new Date('2026-03-01'),
    searchRadiusKm: 15,
    emailVerified: true,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

function buildNearbyUser(overrides: Partial<NearbyUser> = {}): NearbyUser {
  return {
    id: 'user-2',
    displayName: 'Luigi Verdi',
    avatarUrl: null,
    distanceKm: 2.5,
    latitude: 41.91,
    longitude: 12.5,
    dogs: [],
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
    ...overrides,
  };
}

describe('findNearby', () => {
  it('returns nearby users on success', async () => {
    const user = buildUser();
    const nearby = [buildNearbyUser()];
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
      findNearby: vi.fn().mockResolvedValue(nearby),
    });
    const findNearby = createFindNearby({ userRepo });

    const result = await findNearby('user-1', {});

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.users).toHaveLength(1);
    expect(result.data.users[0].displayName).toBe('Luigi Verdi');
    expect(result.data.radius).toBe(15);
    expect(result.data.total).toBe(1);
  });

  it('uses DEFAULT_SEARCH_RADIUS_KM when user has no searchRadiusKm', async () => {
    const user = buildUser({ searchRadiusKm: DEFAULT_SEARCH_RADIUS_KM });
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
      findNearby: vi.fn().mockResolvedValue([]),
    });
    const findNearby = createFindNearby({ userRepo });

    const result = await findNearby('user-1', {});

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.radius).toBe(DEFAULT_SEARCH_RADIUS_KM);
  });

  it('uses custom radiusKm from opts when provided', async () => {
    const user = buildUser();
    const userRepo = buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
      findNearby: vi.fn().mockResolvedValue([]),
    });
    const findNearby = createFindNearby({ userRepo });

    const result = await findNearby('user-1', { radiusKm: 25 });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.radius).toBe(25);
    expect(userRepo.findNearby).toHaveBeenCalledWith(
      expect.objectContaining({ radiusKm: 25 }),
    );
  });

  it('fails with LOCATION_NOT_SET when user has no location', async () => {
    const user = buildUser({ latitude: null, longitude: null });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });
    const findNearby = createFindNearby({ userRepo });

    const result = await findNearby('user-1', {});

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('LOCATION_NOT_SET');
    expect(result.error.status).toBe(400);
  });

  it('fails with LOCATION_NOT_SET when user does not exist', async () => {
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(null) });
    const findNearby = createFindNearby({ userRepo });

    const result = await findNearby('nonexistent', {});

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('LOCATION_NOT_SET');
  });
});
