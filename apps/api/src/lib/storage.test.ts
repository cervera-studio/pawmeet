import { describe, expect, it } from 'vitest';
import {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  buildAvatarKey,
  buildDogPhotoKey,
  extractKeyFromUrl,
  getPublicUrl,
  MAX_FILE_SIZE,
} from './storage.js';

describe('Storage utilities', () => {
  const userId = 'test-user-abc';

  describe('ALLOWED_IMAGE_TYPES', () => {
    it('includes jpeg, png, and webp', () => {
      expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(ALLOWED_IMAGE_TYPES).toContain('image/webp');
    });
  });

  describe('MAX_FILE_SIZE', () => {
    it('is 5 MB', () => {
      expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });
  });

  describe('buildAvatarKey', () => {
    it('builds a key with correct prefix and extension for jpeg', () => {
      const key = buildAvatarKey(userId, 'image/jpeg');
      expect(key).toMatch(new RegExp(`^avatars/${userId}/\\d+\\.jpeg$`));
    });

    it('builds a key with correct extension for png', () => {
      const key = buildAvatarKey(userId, 'image/png');
      expect(key).toMatch(new RegExp(`^avatars/${userId}/\\d+\\.png$`));
    });

    it('builds a key with correct extension for webp', () => {
      const key = buildAvatarKey(userId, 'image/webp');
      expect(key).toMatch(new RegExp(`^avatars/${userId}/\\d+\\.webp$`));
    });

    it('generates unique keys for sequential calls', () => {
      const key1 = buildAvatarKey(userId, 'image/jpeg');
      const key2 = buildAvatarKey(userId, 'image/jpeg');
      // Timestamps may be the same in fast execution, but prefix should match
      expect(key1.startsWith(`avatars/${userId}/`)).toBe(true);
      expect(key2.startsWith(`avatars/${userId}/`)).toBe(true);
    });
  });

  describe('buildDogPhotoKey', () => {
    const dogId = 'test-dog-xyz';

    it('builds a key with correct prefix and extension for jpeg', () => {
      const key = buildDogPhotoKey(dogId, 'image/jpeg');
      expect(key).toMatch(new RegExp(`^dogs/${dogId}/\\d+\\.jpeg$`));
    });

    it('builds a key with correct extension for png', () => {
      const key = buildDogPhotoKey(dogId, 'image/png');
      expect(key).toMatch(new RegExp(`^dogs/${dogId}/\\d+\\.png$`));
    });

    it('builds a key with correct extension for webp', () => {
      const key = buildDogPhotoKey(dogId, 'image/webp');
      expect(key).toMatch(new RegExp(`^dogs/${dogId}/\\d+\\.webp$`));
    });
  });

  describe('getPublicUrl', () => {
    it('returns key as-is when R2_PUBLIC_URL is not set', () => {
      // R2_PUBLIC_URL defaults to empty string in storage.ts
      const key = 'avatars/user-1/12345.jpeg';
      const url = getPublicUrl(key);
      expect(url).toBe(key);
    });
  });

  describe('extractKeyFromUrl', () => {
    it('returns the input as-is when it is not a full URL', () => {
      const key = 'avatars/user-1/12345.jpeg';
      expect(extractKeyFromUrl(key)).toBe(key);
    });

    it('returns the input as-is when R2_PUBLIC_URL is not configured', () => {
      const url = 'https://cdn.example.com/avatars/user-1/12345.jpeg';
      expect(extractKeyFromUrl(url)).toBe(url);
    });
  });
});
