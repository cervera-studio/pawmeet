import { DEFAULT_SEARCH_RADIUS_KM } from '@dogwalk/config';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { NearbyUser } from '../ports/index.js';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createFindNearby } from './find-nearby.js';

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

describe('findNearby', () => {
  it('returns nearby users on success', async () => {
    const user = buildUser({ searchRadiusKm: 15 });
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
    expect(userRepo.findNearby).toHaveBeenCalledWith(expect.objectContaining({ radiusKm: 25 }));
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
