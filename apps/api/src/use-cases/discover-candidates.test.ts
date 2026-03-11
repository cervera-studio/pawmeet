import { COMPATIBILITY_THRESHOLD } from '@dogwalk/config';
import type { DiscoveryFilters } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildCandidate,
  buildDog,
  buildDogRepo,
  buildFollowRepo,
  buildMatchRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createDiscoverCandidates } from './discover-candidates.js';

describe('discoverCandidates', () => {
  it('returns scored and sorted suggestions', async () => {
    const myDog = buildDog();
    const candidate = buildCandidate();
    const user = buildUser();

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([candidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const result = await discover('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.length).toBeGreaterThanOrEqual(1);
    const suggestion = result.data.suggestions[0];
    expect(suggestion.dog.id).toBe('dog-2');
    expect(suggestion.compatibilityScore).toBeGreaterThanOrEqual(COMPATIBILITY_THRESHOLD);
    expect(suggestion.distanceKm).toBeGreaterThan(0);
  });

  it('filters out candidates below compatibility threshold', async () => {
    // Create a very incompatible dog
    const incompatibleCandidate = buildCandidate({
      dog: buildDog({
        id: 'dog-3',
        ownerId: 'user-3',
        size: 'toy',
        energyLevel: 'bassa',
        behaviorWithDogs: 'reattivo',
        leashBehavior: 'difficile',
        walkPrefTime: ['sera_tardi'],
        walkPrefDurationMin: 10,
        walkPrefDurationMax: 15,
        walkPrefTerrain: ['spiaggia'],
      }),
    });

    const myDog = buildDog();
    const user = buildUser();

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([incompatibleCandidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const result = await discover('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    // All returned suggestions must be above threshold
    for (const s of result.data.suggestions) {
      expect(s.compatibilityScore).toBeGreaterThanOrEqual(COMPATIBILITY_THRESHOLD);
    }
  });

  it('excludes already-swiped dogs', async () => {
    const candidate = buildCandidate();
    const myDog = buildDog();
    const user = buildUser();

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findSwipedDogIds: vi.fn().mockResolvedValue(['dog-2']),
      findCandidateDogs: vi.fn().mockResolvedValue([candidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const result = await discover('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.every((s) => s.dog.id !== 'dog-2')).toBe(true);
  });

  it('fails with DOG_NOT_FOUND when dog not owned by user', async () => {
    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(null) });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo();

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const result = await discover('user-1', 'dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });

  it('fails with LOCATION_NOT_SET when user has no location', async () => {
    const myDog = buildDog();
    const user = buildUser({ latitude: null, longitude: null });

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo();
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const result = await discover('user-1', 'dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('LOCATION_NOT_SET');
    expect(result.error.status).toBe(400);
  });

  // ── Filter tests ────────────────────────────────────────────────────────────

  it('filters by size — excludes non-matching dogs', async () => {
    const myDog = buildDog();
    const user = buildUser();
    const smallCandidate = buildCandidate({
      dog: buildDog({ id: 'dog-small', ownerId: 'user-2', size: 'toy', name: 'Tiny' }),
    });
    const largeCandidate = buildCandidate({
      dog: buildDog({ id: 'dog-large', ownerId: 'user-3', size: 'grande', name: 'Big' }),
    });

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([smallCandidate, largeCandidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const filters: DiscoveryFilters = { size: ['grande'] };
    const result = await discover('user-1', 'dog-1', undefined, filters);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.every((s) => s.dog.size === 'grande')).toBe(true);
    expect(result.data.suggestions.some((s) => s.dog.id === 'dog-small')).toBe(false);
  });

  it('filters by energy level', async () => {
    const myDog = buildDog();
    const user = buildUser();
    const lowEnergy = buildCandidate({
      dog: buildDog({ id: 'dog-low', ownerId: 'user-2', energyLevel: 'bassa', name: 'Lazy' }),
    });
    const highEnergy = buildCandidate({
      dog: buildDog({ id: 'dog-high', ownerId: 'user-3', energyLevel: 'alta', name: 'Zoom' }),
    });

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([lowEnergy, highEnergy]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const filters: DiscoveryFilters = { energyLevel: ['alta'] };
    const result = await discover('user-1', 'dog-1', undefined, filters);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.every((s) => s.dog.energyLevel === 'alta')).toBe(true);
  });

  it('filters by gender', async () => {
    const myDog = buildDog();
    const user = buildUser();
    const male = buildCandidate({
      dog: buildDog({ id: 'dog-m', ownerId: 'user-2', gender: 'maschio', name: 'Max' }),
    });
    const female = buildCandidate({
      dog: buildDog({ id: 'dog-f', ownerId: 'user-3', gender: 'femmina', name: 'Luna' }),
    });

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([male, female]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const filters: DiscoveryFilters = { gender: ['femmina'] };
    const result = await discover('user-1', 'dog-1', undefined, filters);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.every((s) => s.dog.gender === 'femmina')).toBe(true);
    expect(result.data.suggestions.some((s) => s.dog.id === 'dog-m')).toBe(false);
  });

  it('combines multiple filters with AND logic', async () => {
    const myDog = buildDog();
    const user = buildUser();
    const matchesBoth = buildCandidate({
      dog: buildDog({
        id: 'dog-both',
        ownerId: 'user-2',
        size: 'grande',
        energyLevel: 'alta',
        name: 'Perfect',
      }),
    });
    const matchesSizeOnly = buildCandidate({
      dog: buildDog({
        id: 'dog-size',
        ownerId: 'user-3',
        size: 'grande',
        energyLevel: 'bassa',
        name: 'BigSlow',
      }),
    });
    const matchesEnergyOnly = buildCandidate({
      dog: buildDog({
        id: 'dog-energy',
        ownerId: 'user-4',
        size: 'toy',
        energyLevel: 'alta',
        name: 'SmallFast',
      }),
    });

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi
        .fn()
        .mockResolvedValue([matchesBoth, matchesSizeOnly, matchesEnergyOnly]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const filters: DiscoveryFilters = { size: ['grande'], energyLevel: ['alta'] };
    const result = await discover('user-1', 'dog-1', undefined, filters);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    // Only the dog matching both filters should appear
    const ids = result.data.suggestions.map((s) => s.dog.id);
    expect(ids).toContain('dog-both');
    expect(ids).not.toContain('dog-size');
    expect(ids).not.toContain('dog-energy');
  });

  it('empty filter arrays do not exclude any dogs', async () => {
    const myDog = buildDog();
    const user = buildUser();
    const candidate = buildCandidate();

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([candidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    // Pass an empty filters object — should not filter anything
    const result = await discover('user-1', 'dog-1', undefined, {});

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('maxDistanceKm overrides user search radius', async () => {
    const myDog = buildDog();
    // User has a 50km radius, but we restrict to 1km via filter
    const user = buildUser({ searchRadiusKm: 50 });
    // Candidate is ~1km away (very close coords)
    const nearCandidate = buildCandidate({
      dog: buildDog({ id: 'dog-near', ownerId: 'user-2', name: 'Near' }),
      ownerLat: 41.903,
      ownerLon: 12.497,
    });
    // Candidate is ~10km away
    const farCandidate = buildCandidate({
      dog: buildDog({ id: 'dog-far', ownerId: 'user-3', name: 'Far' }),
      ownerLat: 42.0,
      ownerLon: 12.5,
    });

    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(myDog) });
    const matchRepo = buildMatchRepo({
      findCandidateDogs: vi.fn().mockResolvedValue([nearCandidate, farCandidate]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(user) });

    const discover = createDiscoverCandidates({
      dogRepo,
      matchRepo,
      userRepo,
      followRepo: buildFollowRepo(),
    });
    const filters: DiscoveryFilters = { maxDistanceKm: 2 };
    const result = await discover('user-1', 'dog-1', undefined, filters);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const ids = result.data.suggestions.map((s) => s.dog.id);
    expect(ids).toContain('dog-near');
    expect(ids).not.toContain('dog-far');
  });
});
