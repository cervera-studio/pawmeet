import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildMatch,
  buildMatchRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createListMatches } from './list-matches.js';

describe('listMatches', () => {
  it('returns empty matches when user has no dogs', async () => {
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([]) });
    const matchRepo = buildMatchRepo({ findActiveByDogIds: vi.fn().mockResolvedValue([]) });
    const userRepo = buildUserRepo();
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toEqual([]);
  });

  it('returns empty matches when there are no active matches', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const dogRepo = buildDogRepo({ findByOwner: vi.fn().mockResolvedValue([myDog]) });
    const matchRepo = buildMatchRepo({ findActiveByDogIds: vi.fn().mockResolvedValue([]) });
    const userRepo = buildUserRepo();
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toEqual([]);
  });

  it('returns enriched matches with other dog and owner info', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1', name: 'Rex' });
    const otherDog = buildDog({ id: 'dog-2', ownerId: 'user-2', name: 'Bella', breed: 'Beagle' });
    const otherOwner = buildUser({ id: 'user-2', displayName: 'Altro Utente' });
    const match = buildMatch({ id: 'match-1', dogAId: 'dog-1', dogBId: 'dog-2' });

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: vi.fn().mockResolvedValue([myDog, otherDog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match]),
    });
    const userRepo = buildUserRepo({
      findByIds: vi.fn().mockResolvedValue([otherOwner]),
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toHaveLength(1);
    const enriched = result.data.matches[0];
    expect(enriched.id).toBe('match-1');
    expect(enriched.dogId).toBe('dog-1');
    expect(enriched.compatibilityScore).toBe(0.85);
    expect(enriched.otherDog).toEqual({ id: 'dog-2', name: 'Bella', breed: 'Beagle' });
    expect(enriched.otherOwner).toEqual({ id: 'user-2', displayName: 'Altro Utente' });
  });

  it('uses fallback values when dog or owner not found', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const match = buildMatch({ id: 'match-1', dogAId: 'dog-1', dogBId: 'dog-missing' });

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: vi.fn().mockResolvedValue([myDog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match]),
    });
    const userRepo = buildUserRepo({
      findByIds: vi.fn().mockResolvedValue([]),
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const enriched = result.data.matches[0];
    expect(enriched.dogId).toBe('dog-1');
    expect(enriched.otherDog).toEqual({ id: 'dog-missing', name: 'Sconosciuto', breed: '' });
    expect(enriched.otherOwner).toEqual({ id: '', displayName: 'Utente' });
  });

  it('correctly identifies the other dog when user dog is dogB', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const otherDog = buildDog({
      id: 'dog-3',
      ownerId: 'user-3',
      name: 'Luna',
      breed: 'Pastore Tedesco',
    });
    const otherOwner = buildUser({ id: 'user-3', displayName: 'Marco' });
    const match = buildMatch({ id: 'match-2', dogAId: 'dog-3', dogBId: 'dog-1' });

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: vi.fn().mockResolvedValue([myDog, otherDog]),
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match]),
    });
    const userRepo = buildUserRepo({
      findByIds: vi.fn().mockResolvedValue([otherOwner]),
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const enriched = result.data.matches[0];
    expect(enriched.dogId).toBe('dog-1');
    expect(enriched.otherDog).toEqual({ id: 'dog-3', name: 'Luna', breed: 'Pastore Tedesco' });
    expect(enriched.otherOwner).toEqual({ id: 'user-3', displayName: 'Marco' });
  });

  it('batch-fetches dogs and owners efficiently', async () => {
    const myDog = buildDog({ id: 'dog-1', ownerId: 'user-1' });
    const otherDog1 = buildDog({ id: 'dog-2', ownerId: 'user-2', name: 'Bella', breed: 'Beagle' });
    const otherDog2 = buildDog({ id: 'dog-3', ownerId: 'user-3', name: 'Luna', breed: 'Husky' });
    const owner2 = buildUser({ id: 'user-2', displayName: 'Anna' });
    const owner3 = buildUser({ id: 'user-3', displayName: 'Marco' });

    const match1 = buildMatch({ id: 'match-1', dogAId: 'dog-1', dogBId: 'dog-2' });
    const match2 = buildMatch({ id: 'match-2', dogAId: 'dog-1', dogBId: 'dog-3' });

    const findByIdsDog = vi.fn().mockResolvedValue([myDog, otherDog1, otherDog2]);
    const findByIdsUser = vi.fn().mockResolvedValue([owner2, owner3]);

    const dogRepo = buildDogRepo({
      findByOwner: vi.fn().mockResolvedValue([myDog]),
      findByIds: findByIdsDog,
    });
    const matchRepo = buildMatchRepo({
      findActiveByDogIds: vi.fn().mockResolvedValue([match1, match2]),
    });
    const userRepo = buildUserRepo({
      findByIds: findByIdsUser,
    });
    const listMatches = createListMatches({ dogRepo, matchRepo, userRepo });

    const result = await listMatches('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.matches).toHaveLength(2);
    // Verify batch calls were made once each
    expect(findByIdsDog).toHaveBeenCalledTimes(1);
    expect(findByIdsUser).toHaveBeenCalledTimes(1);
  });
});
