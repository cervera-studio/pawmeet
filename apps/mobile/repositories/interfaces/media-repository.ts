export interface UploadResult {
  uploadUrl: string;
  key: string;
}

export type MediaContentType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'video/mp4'
  | 'video/quicktime';

export interface MediaRepository {
  getDogPhotoUploadUrl(
    dogId: string,
    contentType: MediaContentType,
    fileSize: number,
  ): Promise<UploadResult>;
  confirmDogPhoto(dogId: string, key: string): Promise<{ photo: { id: string; url: string } }>;
  getAvatarUploadUrl(contentType: MediaContentType, fileSize: number): Promise<UploadResult>;
  confirmAvatar(key: string): Promise<{ avatarUrl: string }>;
  getPostMediaUploadUrl(
    postId: string,
    contentType: MediaContentType,
    fileSize: number,
  ): Promise<UploadResult>;
  confirmPostMedia(
    postId: string,
    key: string,
    mediaType: 'photo' | 'video',
    position: number,
  ): Promise<void>;
  getStoryUploadUrl(
    contentType: MediaContentType,
    fileSize: number,
  ): Promise<UploadResult & { key: string }>;
  confirmStory(key: string, mediaType: 'photo' | 'video'): Promise<void>;
  uploadBlob(uploadUrl: string, blob: Blob, contentType: string): Promise<void>;
}
