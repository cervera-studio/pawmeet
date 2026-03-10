export interface StorageService {
  generatePresignedUploadUrl(key: string, contentType: string): Promise<string>;
  generateAvatarUploadUrl(userId: string, contentType: string): Promise<{ uploadUrl: string; key: string }>;
  buildDogPhotoKey(dogId: string, contentType: string): string;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  extractKeyFromUrl(url: string): string;
}
