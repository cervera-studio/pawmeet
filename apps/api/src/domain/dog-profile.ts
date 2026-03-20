import { MAX_DOGS_PER_USER, MAX_PHOTOS_PER_DOG } from '@pawmeet/config';
import type { DogProfile } from '@pawmeet/types';

/**
 * DogProfile aggregate root — encapsulates business rules for dog profiles.
 * Pure domain logic, no side effects.
 */
export interface DogProfileAggregate {
  readonly dog: DogProfile;

  /** Whether the dog profile is visible and usable. */
  isActive(): boolean;

  /** Whether this dog belongs to the given user. */
  isOwnedBy(userId: string): boolean;

  /** Whether a photo key matches this dog's storage path. */
  isValidPhotoKey(key: string): boolean;

  /** Whether this dog can accept more photos. */
  canAddPhoto(currentPhotoCount: number): boolean;

  /** Validate that a reorder request covers all existing photos exactly once. */
  isValidPhotoReorder(requestedIds: string[], existingIds: string[]): boolean;
}

export function createDogProfileAggregate(dog: DogProfile): DogProfileAggregate {
  return {
    dog,

    isActive() {
      return dog.isActive;
    },

    isOwnedBy(userId: string) {
      return dog.ownerId === userId;
    },

    isValidPhotoKey(key: string) {
      return key.startsWith(`dogs/${dog.id}/`);
    },

    canAddPhoto(currentPhotoCount: number) {
      return currentPhotoCount < MAX_PHOTOS_PER_DOG;
    },

    isValidPhotoReorder(requestedIds: string[], existingIds: string[]) {
      if (requestedIds.length !== existingIds.length) return false;
      const existing = new Set(existingIds);
      return requestedIds.every((id) => existing.has(id));
    },
  };
}

// ── Static domain rules (no aggregate instance needed) ────────────────────────

/** Whether a user can register another dog. */
export function canCreateDog(currentDogCount: number): boolean {
  return currentDogCount < MAX_DOGS_PER_USER;
}

/**
 * Recompute photo positions after a deletion or reorder.
 * Returns new position assignments with the first photo as primary.
 */
export function reindexPhotos(
  photoIds: string[],
): { id: string; position: number; isPrimary: boolean }[] {
  return photoIds.map((id, i) => ({
    id,
    position: i,
    isPrimary: i === 0,
  }));
}
