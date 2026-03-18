import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createGetPublicDogProfile } from './get-public-dog-profile.js';

describe('getPublicDogProfile', () => {
  it('returns public profile with approved photos only', async () => {
    const dog = buildDog({ birthDate: new Date('2022-06-01') });
    const owner = buildUser({ displayName: 'Mario Rossi' });
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockResolvedValue(dog),
      findPhotos: vi.fn().mockResolvedValue([
        {
          id: 'p1',
          dogId: 'dog-1',
          url: 'https://cdn.example.com/1.jpg',
          position: 0,
          isPrimary: true,
          moderationStatus: 'approved',
          uploadedAt: new Date(),
        },
        {
          id: 'p2',
          dogId: 'dog-1',
          url: 'https://cdn.example.com/2.jpg',
          position: 1,
          isPrimary: false,
          moderationStatus: 'pending',
          uploadedAt: new Date(),
        },
        {
          id: 'p3',
          dogId: 'dog-1',
          url: 'https://cdn.example.com/3.jpg',
          position: 2,
          isPrimary: false,
          moderationStatus: 'approved',
          uploadedAt: new Date(),
        },
      ]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(owner) });
    const getPublicDogProfile = createGetPublicDogProfile({ dogRepo, userRepo });

    const result = await getPublicDogProfile('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('dog-1');
    expect(result.data.name).toBe('Rex');
    expect(result.data.ownerFirstName).toBe('Mario');
    expect(result.data.photos).toHaveLength(2);
    expect(result.data.photos[0].url).toBe('https://cdn.example.com/1.jpg');
    expect(result.data.photos[1].url).toBe('https://cdn.example.com/3.jpg');
  });

  it('fails with DOG_NOT_FOUND when dog does not exist', async () => {
    const dogRepo = buildDogRepo({ findById: vi.fn().mockResolvedValue(null) });
    const userRepo = buildUserRepo();
    const getPublicDogProfile = createGetPublicDogProfile({ dogRepo, userRepo });

    const result = await getPublicDogProfile('nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with DOG_NOT_FOUND when dog is inactive', async () => {
    const dog = buildDog({ isActive: false });
    const dogRepo = buildDogRepo({ findById: vi.fn().mockResolvedValue(dog) });
    const userRepo = buildUserRepo();
    const getPublicDogProfile = createGetPublicDogProfile({ dogRepo, userRepo });

    const result = await getPublicDogProfile('dog-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('filters out non-approved photos', async () => {
    const dog = buildDog();
    const owner = buildUser();
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockResolvedValue(dog),
      findPhotos: vi.fn().mockResolvedValue([
        {
          id: 'p1',
          dogId: 'dog-1',
          url: 'https://cdn.example.com/1.jpg',
          position: 0,
          isPrimary: true,
          moderationStatus: 'pending',
          uploadedAt: new Date(),
        },
        {
          id: 'p2',
          dogId: 'dog-1',
          url: 'https://cdn.example.com/2.jpg',
          position: 1,
          isPrimary: false,
          moderationStatus: 'rejected',
          uploadedAt: new Date(),
        },
      ]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(owner) });
    const getPublicDogProfile = createGetPublicDogProfile({ dogRepo, userRepo });

    const result = await getPublicDogProfile('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.photos).toHaveLength(0);
  });

  it('extracts first name from owner displayName', async () => {
    const dog = buildDog();
    const owner = buildUser({ displayName: 'Giovanni De Luca' });
    const dogRepo = buildDogRepo({
      findById: vi.fn().mockResolvedValue(dog),
      findPhotos: vi.fn().mockResolvedValue([]),
    });
    const userRepo = buildUserRepo({ findById: vi.fn().mockResolvedValue(owner) });
    const getPublicDogProfile = createGetPublicDogProfile({ dogRepo, userRepo });

    const result = await getPublicDogProfile('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.ownerFirstName).toBe('Giovanni');
  });
});
