import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGeneratePresignedUploadUrl = vi.fn().mockResolvedValue('https://r2.example.com/upload');
const mockGenerateUploadUrl = vi
  .fn()
  .mockResolvedValue({ uploadUrl: 'https://r2.example.com/avatar', key: 'avatars/u1/123.jpeg' });
const mockBuildDogPhotoKey = vi.fn().mockReturnValue('dogs/d1/123.jpeg');
const mockBuildPostMediaKey = vi.fn().mockReturnValue('posts/p1/123.jpeg');
const mockBuildStoryMediaKey = vi.fn().mockReturnValue('stories/u1/123.mp4');
const mockBuildChatMediaKey = vi.fn().mockReturnValue('chat/m1/123.jpeg');
const mockDeleteObject = vi.fn().mockResolvedValue(undefined);
const mockUploadObject = vi.fn().mockResolvedValue(undefined);
const mockGeneratePresignedDownloadUrl = vi
  .fn()
  .mockResolvedValue('https://r2.example.com/download');
const mockGetPublicUrl = vi.fn().mockReturnValue('https://cdn.example.com/key');
const mockExtractKeyFromUrl = vi.fn().mockReturnValue('some/key');

vi.mock('../lib/storage.js', () => ({
  generatePresignedUploadUrl: (...args: unknown[]) => mockGeneratePresignedUploadUrl(...args),
  generateUploadUrl: (...args: unknown[]) => mockGenerateUploadUrl(...args),
  buildDogPhotoKey: (...args: unknown[]) => mockBuildDogPhotoKey(...args),
  buildPostMediaKey: (...args: unknown[]) => mockBuildPostMediaKey(...args),
  buildStoryMediaKey: (...args: unknown[]) => mockBuildStoryMediaKey(...args),
  buildChatMediaKey: (...args: unknown[]) => mockBuildChatMediaKey(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
  uploadObject: (...args: unknown[]) => mockUploadObject(...args),
  generatePresignedDownloadUrl: (...args: unknown[]) => mockGeneratePresignedDownloadUrl(...args),
  getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
  extractKeyFromUrl: (...args: unknown[]) => mockExtractKeyFromUrl(...args),
}));

import { R2StorageService } from './r2-storage-service.js';

describe('R2StorageService', () => {
  let service: R2StorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new R2StorageService();
  });

  describe('generatePresignedUploadUrl', () => {
    it('delegates to the storage lib with key and contentType', async () => {
      const url = await service.generatePresignedUploadUrl('dogs/d1/photo.jpeg', 'image/jpeg');

      expect(mockGeneratePresignedUploadUrl).toHaveBeenCalledWith(
        'dogs/d1/photo.jpeg',
        'image/jpeg',
      );
      expect(url).toBe('https://r2.example.com/upload');
    });
  });

  describe('generateAvatarUploadUrl', () => {
    it('delegates to generateUploadUrl and returns url + key', async () => {
      const result = await service.generateAvatarUploadUrl('user-1', 'image/jpeg');

      expect(mockGenerateUploadUrl).toHaveBeenCalledWith('user-1', 'image/jpeg');
      expect(result).toEqual({
        uploadUrl: 'https://r2.example.com/avatar',
        key: 'avatars/u1/123.jpeg',
      });
    });
  });

  describe('buildDogPhotoKey', () => {
    it('delegates to the storage lib', () => {
      const key = service.buildDogPhotoKey('dog-1', 'image/png');

      expect(mockBuildDogPhotoKey).toHaveBeenCalledWith('dog-1', 'image/png');
      expect(key).toBe('dogs/d1/123.jpeg');
    });
  });

  describe('buildPostMediaKey', () => {
    it('delegates to the storage lib', () => {
      const key = service.buildPostMediaKey('post-1', 'image/webp');

      expect(mockBuildPostMediaKey).toHaveBeenCalledWith('post-1', 'image/webp');
      expect(key).toBe('posts/p1/123.jpeg');
    });
  });

  describe('buildStoryMediaKey', () => {
    it('delegates to the storage lib', () => {
      const key = service.buildStoryMediaKey('user-1', 'video/mp4');

      expect(mockBuildStoryMediaKey).toHaveBeenCalledWith('user-1', 'video/mp4');
      expect(key).toBe('stories/u1/123.mp4');
    });
  });

  describe('buildChatMediaKey', () => {
    it('delegates to the storage lib', () => {
      const key = service.buildChatMediaKey('match-1', 'image/jpeg');

      expect(mockBuildChatMediaKey).toHaveBeenCalledWith('match-1', 'image/jpeg');
      expect(key).toBe('chat/m1/123.jpeg');
    });
  });

  describe('deleteObject', () => {
    it('delegates to the storage lib', async () => {
      await service.deleteObject('dogs/d1/old.jpeg');

      expect(mockDeleteObject).toHaveBeenCalledWith('dogs/d1/old.jpeg');
    });

    it('propagates errors', async () => {
      mockDeleteObject.mockRejectedValueOnce(new Error('S3 error'));

      await expect(service.deleteObject('bad-key')).rejects.toThrow('S3 error');
    });
  });

  describe('uploadObject', () => {
    it('delegates to the storage lib with key, body, and contentType', async () => {
      await service.uploadObject('exports/data.json', '{"foo":"bar"}', 'application/json');

      expect(mockUploadObject).toHaveBeenCalledWith(
        'exports/data.json',
        '{"foo":"bar"}',
        'application/json',
      );
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('delegates with default expiry', async () => {
      const url = await service.generatePresignedDownloadUrl('dogs/d1/photo.jpeg');

      expect(mockGeneratePresignedDownloadUrl).toHaveBeenCalledWith(
        'dogs/d1/photo.jpeg',
        undefined,
      );
      expect(url).toBe('https://r2.example.com/download');
    });

    it('passes custom expiry seconds', async () => {
      await service.generatePresignedDownloadUrl('dogs/d1/photo.jpeg', 3600);

      expect(mockGeneratePresignedDownloadUrl).toHaveBeenCalledWith('dogs/d1/photo.jpeg', 3600);
    });
  });

  describe('getPublicUrl', () => {
    it('delegates to the storage lib', () => {
      const url = service.getPublicUrl('dogs/d1/photo.jpeg');

      expect(mockGetPublicUrl).toHaveBeenCalledWith('dogs/d1/photo.jpeg');
      expect(url).toBe('https://cdn.example.com/key');
    });
  });

  describe('extractKeyFromUrl', () => {
    it('delegates to the storage lib', () => {
      const key = service.extractKeyFromUrl('https://cdn.example.com/dogs/d1/photo.jpeg');

      expect(mockExtractKeyFromUrl).toHaveBeenCalledWith(
        'https://cdn.example.com/dogs/d1/photo.jpeg',
      );
      expect(key).toBe('some/key');
    });
  });
});
