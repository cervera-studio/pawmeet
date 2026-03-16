import type { DogPhoto, DogProfile } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import type { dogDeps } from '../../container/index.js';
import { router } from '../trpc.js';
import { createDogsRouter } from './dogs.js';

// ── Builders ──────────────────────────────────────────────────────────────────

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'user-1',
    name: 'Rex',
    birthDate: new Date('2022-01-01'),
    breed: 'Labrador',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'affidabile',
    bio: null,
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildPhoto(overrides: Partial<DogPhoto> = {}): DogPhoto {
  return {
    id: 'photo-1',
    dogId: 'dog-1',
    url: 'https://example.com/photo.jpg',
    position: 0,
    isPrimary: true,
    moderationStatus: 'approved',
    uploadedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const validCreateInput = {
  name: 'Rex',
  birthDate: '2022-01-01',
  breed: 'Labrador',
  size: 'grande' as const,
  weightKg: 30,
  gender: 'maschio' as const,
  isNeutered: true,
  energyLevel: 'alta' as const,
  behaviorWithDogs: 'socievole' as const,
  behaviorWithPeople: 'molto_socievole' as const,
  leashBehavior: 'buono' as const,
  walkPrefTime: ['mattina' as const],
  walkPrefDurationMin: 30,
  walkPrefDurationMax: 60,
  walkPrefTerrain: ['parco' as const],
};

function buildDogDeps(overrides: Partial<typeof dogDeps> = {}): typeof dogDeps {
  return {
    searchBreeds: vi.fn().mockResolvedValue(succeed({ breeds: [] })),
    listUserDogs: vi.fn().mockResolvedValue(succeed({ dogs: [buildDog()] })),
    createDog: vi.fn().mockResolvedValue(succeed({ dog: buildDog() })),
    getDog: vi.fn().mockResolvedValue(succeed({ dog: buildDog(), photos: [buildPhoto()] })),
    updateDog: vi.fn().mockResolvedValue(succeed({ dog: buildDog({ name: 'Updated' }) })),
    deleteDog: vi.fn().mockResolvedValue(succeed({ message: 'Profilo cane eliminato' })),
    uploadDogPhotoUrl: vi
      .fn()
      .mockResolvedValue(succeed({ uploadUrl: 'https://upload.url', key: 'dogs/dog-1/img.jpg' })),
    confirmDogPhoto: vi.fn().mockResolvedValue(succeed({ photo: buildPhoto() })),
    deleteDogPhoto: vi.fn().mockResolvedValue(succeed({ message: 'Foto eliminata' })),
    reorderDogPhotos: vi.fn().mockResolvedValue(succeed({ message: 'Ordine aggiornato' })),
    ...overrides,
  };
}

function createAuthenticatedCaller(deps: typeof dogDeps, userId = 'user-1') {
  const appRouter = router({ dogs: createDogsRouter(deps) });
  return appRouter.createCaller({ userId });
}

function createAnonCaller(deps: typeof dogDeps) {
  const appRouter = router({ dogs: createDogsRouter(deps) });
  return appRouter.createCaller({ userId: null });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('dogs router', () => {
  describe('searchBreeds', () => {
    it('returns breeds (public procedure)', async () => {
      const breeds = [
        {
          id: 'b1',
          code: 'labrador',
          group: 'Retriever',
          sizeCategory: 'large',
          avgWeightKg: 30,
        },
      ];
      const deps = buildDogDeps({
        searchBreeds: vi.fn().mockResolvedValue(succeed({ breeds })),
      });
      // searchBreeds is a public procedure, so anon caller should work
      const caller = createAnonCaller(deps);

      const result = await caller.dogs.searchBreeds({ q: 'lab' });

      expect(result.breeds).toEqual(breeds);
      expect(deps.searchBreeds).toHaveBeenCalledWith('lab');
    });

    it('works without query parameter', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);

      const result = await caller.dogs.searchBreeds({});

      expect(result.breeds).toEqual([]);
      expect(deps.searchBreeds).toHaveBeenCalledWith(undefined);
    });
  });

  describe('create', () => {
    it('creates a dog for authenticated user', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.dogs.create(validCreateInput);

      expect(result.dog.name).toBe('Rex');
      expect(deps.createDog).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'Rex' }),
      );
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.dogs.create(validCreateInput)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
      expect(deps.createDog).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST when dog limit is reached', async () => {
      const deps = buildDogDeps({
        createDog: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('DOG_LIMIT_REACHED', 'Puoi registrare al massimo 5 cani', 400)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.dogs.create(validCreateInput)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('rejects invalid input (missing required fields)', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);

      // Missing name and other required fields
      await expect(
        // @ts-expect-error -- testing invalid input
        caller.dogs.create({ name: 'X' }),
      ).rejects.toThrow(TRPCError);
      expect(deps.createDog).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns dog with photos for authenticated user', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await caller.dogs.get({ id: dogId });

      expect(result.dog.id).toBe('dog-1');
      expect(result.photos).toHaveLength(1);
      expect(deps.getDog).toHaveBeenCalledWith(dogId);
    });

    it('throws NOT_FOUND when dog does not exist', async () => {
      const deps = buildDogDeps({
        getDog: vi
          .fn()
          .mockResolvedValue(fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404))),
      });
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440099';

      await expect(caller.dogs.get({ id: dogId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.dogs.get({ id: 'dog-1' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects invalid UUID', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.dogs.get({ id: 'not-a-uuid' })).rejects.toThrow(TRPCError);
      expect(deps.getDog).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns dogs for authenticated user', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.dogs.list();

      expect(result.dogs).toHaveLength(1);
      expect(result.dogs[0].name).toBe('Rex');
      expect(deps.listUserDogs).toHaveBeenCalledWith('user-1');
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.dogs.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('update', () => {
    it('updates a dog', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await caller.dogs.update({
        id: dogId,
        data: { name: 'Updated' },
      });

      expect(result.dog.name).toBe('Updated');
      expect(deps.updateDog).toHaveBeenCalledWith(dogId, 'user-1', { name: 'Updated' });
    });

    it('throws NOT_FOUND when dog does not exist or user is not owner', async () => {
      const deps = buildDogDeps({
        updateDog: vi
          .fn()
          .mockResolvedValue(fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404))),
      });
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        caller.dogs.update({ id: dogId, data: { name: 'Unknown Dog' } }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(caller.dogs.update({ id: dogId, data: { name: 'X' } })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('delete', () => {
    it('soft-deletes a dog', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await caller.dogs.delete({ id: dogId });

      expect(result.message).toBe('Profilo cane eliminato');
      expect(deps.deleteDog).toHaveBeenCalledWith(dogId, 'user-1');
    });

    it('throws NOT_FOUND when dog does not exist or user is not owner', async () => {
      const deps = buildDogDeps({
        deleteDog: vi
          .fn()
          .mockResolvedValue(fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404))),
      });
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(caller.dogs.delete({ id: dogId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(caller.dogs.delete({ id: dogId })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('uploadPhotoUrl', () => {
    it('returns upload URL for authenticated user', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await caller.dogs.uploadPhotoUrl({
        dogId,
        contentType: 'image/jpeg',
        fileSize: 1024,
      });

      expect(result.uploadUrl).toBe('https://upload.url');
      expect(result.key).toBe('dogs/dog-1/img.jpg');
    });

    it('throws BAD_REQUEST when photo limit is reached', async () => {
      const deps = buildDogDeps({
        uploadDogPhotoUrl: vi
          .fn()
          .mockResolvedValue(fail(new AppError('PHOTO_LIMIT_REACHED', 'Limite foto', 400))),
      });
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        caller.dogs.uploadPhotoUrl({ dogId, contentType: 'image/jpeg', fileSize: 1024 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        caller.dogs.uploadPhotoUrl({ dogId, contentType: 'image/jpeg', fileSize: 1024 }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('confirmPhoto', () => {
    it('confirms a photo upload', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await caller.dogs.confirmPhoto({ dogId, key: 'dogs/dog-1/img.jpg' });

      expect(result.photo).toBeDefined();
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        caller.dogs.confirmPhoto({ dogId, key: 'dogs/dog-1/img.jpg' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('deletePhoto', () => {
    it('deletes a photo', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';
      const photoId = '550e8400-e29b-41d4-a716-446655440001';

      const result = await caller.dogs.deletePhoto({ dogId, photoId });

      expect(result.message).toBe('Foto eliminata');
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';
      const photoId = '550e8400-e29b-41d4-a716-446655440001';

      await expect(caller.dogs.deletePhoto({ dogId, photoId })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('reorderPhotos', () => {
    it('reorders photos', async () => {
      const deps = buildDogDeps();
      const caller = createAuthenticatedCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';
      const photoIds = ['550e8400-e29b-41d4-a716-446655440001'];

      const result = await caller.dogs.reorderPhotos({ dogId, photoIds });

      expect(result.message).toBe('Ordine aggiornato');
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildDogDeps();
      const caller = createAnonCaller(deps);
      const dogId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        caller.dogs.reorderPhotos({ dogId, photoIds: ['550e8400-e29b-41d4-a716-446655440001'] }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });
});
