import type { ApiClient } from '@pawmeet/api-client';
import type { MediaContentType, MediaRepository } from '../interfaces';

export function createTrpcMediaRepository(api: ApiClient): MediaRepository {
  return {
    async getDogPhotoUploadUrl(dogId, contentType, fileSize) {
      return api.dogs.uploadPhotoUrl.mutate({ dogId, contentType, fileSize });
    },
    async confirmDogPhoto(dogId, key) {
      return api.dogs.confirmPhoto.mutate({ dogId, key });
    },
    async getAvatarUploadUrl(contentType, fileSize) {
      return api.users.uploadAvatarUrl.mutate({ contentType, fileSize });
    },
    async confirmAvatar(key) {
      return api.users.confirmAvatar.mutate({ key });
    },
    async getPostMediaUploadUrl(postId, contentType: MediaContentType, fileSize) {
      return api.feed.uploadMediaUrl.mutate({ postId, contentType, fileSize });
    },
    async confirmPostMedia(postId, key, mediaType, position) {
      await api.feed.confirmMedia.mutate({ postId, key, mediaType, position });
    },
    async getStoryUploadUrl(contentType: MediaContentType, fileSize) {
      return api.feed.createStory.mutate({ contentType, fileSize });
    },
    async confirmStory(key, mediaType) {
      await api.feed.confirmStory.mutate({ key, mediaType });
    },
    async uploadBlob(uploadUrl, blob, contentType) {
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
    },
  };
}
