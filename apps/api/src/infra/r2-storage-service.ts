import {
  type AllowedImageType,
  buildDogPhotoKey as buildDogPhotoKeyLib,
  deleteObject,
  extractKeyFromUrl,
  generatePresignedUploadUrl,
  generateUploadUrl,
  getPublicUrl,
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

  async deleteObject(key: string): Promise<void> {
    return deleteObject(key);
  }

  getPublicUrl(key: string): string {
    return getPublicUrl(key);
  }

  extractKeyFromUrl(url: string): string {
    return extractKeyFromUrl(url);
  }
}
