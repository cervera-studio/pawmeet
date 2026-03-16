import {
  type AllowedImageType,
  type AllowedMediaType,
  buildChatMediaKey as buildChatMediaKeyLib,
  buildDogPhotoKey as buildDogPhotoKeyLib,
  buildPostMediaKey as buildPostMediaKeyLib,
  buildStoryMediaKey as buildStoryMediaKeyLib,
  deleteObject,
  extractKeyFromUrl,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  generateUploadUrl,
  getPublicUrl,
  uploadObject,
} from '../lib/storage.js';
import type { StorageService } from '../ports/storage-service.js';

export class R2StorageService implements StorageService {
  async generatePresignedUploadUrl(key: string, contentType: string): Promise<string> {
    return generatePresignedUploadUrl(key, contentType as AllowedImageType);
  }

  async generateAvatarUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    return generateUploadUrl(userId, contentType as AllowedImageType);
  }

  buildDogPhotoKey(dogId: string, contentType: string): string {
    return buildDogPhotoKeyLib(dogId, contentType as AllowedImageType);
  }

  buildPostMediaKey(postId: string, contentType: string): string {
    return buildPostMediaKeyLib(postId, contentType as AllowedMediaType);
  }

  buildStoryMediaKey(userId: string, contentType: string): string {
    return buildStoryMediaKeyLib(userId, contentType as AllowedMediaType);
  }

  buildChatMediaKey(matchId: string, contentType: string): string {
    return buildChatMediaKeyLib(matchId, contentType as AllowedMediaType);
  }

  async deleteObject(key: string): Promise<void> {
    return deleteObject(key);
  }

  async uploadObject(key: string, body: string, contentType: string): Promise<void> {
    return uploadObject(key, body, contentType);
  }

  async generatePresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return generatePresignedDownloadUrl(key, expiresInSeconds);
  }

  getPublicUrl(key: string): string {
    return getPublicUrl(key);
  }

  extractKeyFromUrl(url: string): string {
    return extractKeyFromUrl(url);
  }
}
