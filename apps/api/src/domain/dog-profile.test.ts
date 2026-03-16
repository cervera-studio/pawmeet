import { describe, expect, it } from 'vitest';
import { buildDog } from '../test-utils/builders.js';
import {
  canAddPhoto,
  canCreateDog,
  createDogProfileAggregate,
  isValidPhotoReorder,
  reindexPhotos,
} from './dog-profile.js';

describe('DogProfileAggregate', () => {
  describe('isActive', () => {
    it('returns true for active dog', () => {
      const agg = createDogProfileAggregate(buildDog({ isActive: true }));
      expect(agg.isActive()).toBe(true);
    });

    it('returns false for inactive dog', () => {
      const agg = createDogProfileAggregate(buildDog({ isActive: false }));
      expect(agg.isActive()).toBe(false);
    });
  });

  describe('isOwnedBy', () => {
    it('returns true for the owner', () => {
      const agg = createDogProfileAggregate(buildDog({ ownerId: 'user-1' }));
      expect(agg.isOwnedBy('user-1')).toBe(true);
    });

    it('returns false for another user', () => {
      const agg = createDogProfileAggregate(buildDog({ ownerId: 'user-1' }));
      expect(agg.isOwnedBy('user-2')).toBe(false);
    });
  });

  describe('isValidPhotoKey', () => {
    it('accepts a valid key', () => {
      const agg = createDogProfileAggregate(buildDog({ id: 'dog-1' }));
      expect(agg.isValidPhotoKey('dogs/dog-1/photo.jpg')).toBe(true);
    });

    it('rejects a key for another dog', () => {
      const agg = createDogProfileAggregate(buildDog({ id: 'dog-1' }));
      expect(agg.isValidPhotoKey('dogs/dog-2/photo.jpg')).toBe(false);
    });

    it('rejects a completely wrong path', () => {
      const agg = createDogProfileAggregate(buildDog({ id: 'dog-1' }));
      expect(agg.isValidPhotoKey('users/user-1/avatar.jpg')).toBe(false);
    });
  });
});

describe('canCreateDog', () => {
  it('allows creation when below limit', () => {
    expect(canCreateDog(0)).toBe(true);
    expect(canCreateDog(4)).toBe(true);
  });

  it('rejects when at limit', () => {
    expect(canCreateDog(5)).toBe(false);
  });

  it('rejects when above limit', () => {
    expect(canCreateDog(6)).toBe(false);
  });
});

describe('canAddPhoto', () => {
  it('allows adding when below limit', () => {
    expect(canAddPhoto(0)).toBe(true);
    expect(canAddPhoto(5)).toBe(true);
  });

  it('rejects when at limit', () => {
    expect(canAddPhoto(6)).toBe(false);
  });
});

describe('reindexPhotos', () => {
  it('sets first photo as primary', () => {
    const result = reindexPhotos(['p-3', 'p-1', 'p-2']);
    expect(result[0]).toEqual({ id: 'p-3', position: 0, isPrimary: true });
    expect(result[1]).toEqual({ id: 'p-1', position: 1, isPrimary: false });
    expect(result[2]).toEqual({ id: 'p-2', position: 2, isPrimary: false });
  });

  it('handles single photo', () => {
    const result = reindexPhotos(['p-1']);
    expect(result).toEqual([{ id: 'p-1', position: 0, isPrimary: true }]);
  });

  it('handles empty array', () => {
    expect(reindexPhotos([])).toEqual([]);
  });
});

describe('isValidPhotoReorder', () => {
  it('accepts valid reorder with all photos', () => {
    expect(isValidPhotoReorder(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
  });

  it('rejects if a photo is missing', () => {
    expect(isValidPhotoReorder(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });

  it('rejects if an unknown photo is included', () => {
    expect(isValidPhotoReorder(['a', 'b', 'x'], ['a', 'b', 'c'])).toBe(false);
  });

  it('rejects different lengths', () => {
    expect(isValidPhotoReorder(['a'], ['a', 'b'])).toBe(false);
  });
});
