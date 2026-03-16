export interface StorageService {
  generatePresignedUploadUrl(key: string, contentType: string): Promise<string>;
  generateAvatarUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; key: string }>;
  buildDogPhotoKey(dogId: string, contentType: string): string;
  buildPostMediaKey(postId: string, contentType: string): string;
  buildStoryMediaKey(userId: string, contentType: string): string;
  buildChatMediaKey(matchId: string, contentType: string): string;
  deleteObject(key: string): Promise<void>;
  uploadObject(key: string, body: string, contentType: string): Promise<void>;
  generatePresignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getPublicUrl(key: string): string;
  extractKeyFromUrl(url: string): string;
}
