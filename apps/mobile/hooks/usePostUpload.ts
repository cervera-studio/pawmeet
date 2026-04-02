import type { MediaType } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { uploadToPresignedUrl } from '@/lib/upload';
import { container } from '@/repositories/container';
import type { MediaContentType } from '@/repositories/interfaces';
import { FEED_REPOSITORY, MEDIA_REPOSITORY } from '@/repositories/tokens';

interface UploadProgress {
  current: number;
  total: number;
}

const feedRepo = container.resolve(FEED_REPOSITORY);
const mediaRepo = container.resolve(MEDIA_REPOSITORY);

export function usePostUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ current: 0, total: 0 });

  const createPost = useCallback(
    async (input: {
      caption: string | null;
      latitude: number | null;
      longitude: number | null;
      walkId: string | null;
    }) => {
      try {
        const result = await feedRepo.createPost(input);
        return result.post;
      } catch (e) {
        logger.warn('usePostUpload', 'Failed to create post', e);
        return null;
      }
    },
    [],
  );

  const uploadMedia = useCallback(
    async (
      postId: string,
      files: { uri: string; type: string; fileSize: number }[],
    ): Promise<boolean> => {
      setUploading(true);
      setProgress({ current: 0, total: files.length });

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file) continue;

          const contentType = file.type as MediaContentType;
          const { uploadUrl, key } = await mediaRepo.getPostMediaUploadUrl(
            postId,
            contentType,
            file.fileSize,
          );

          await uploadToPresignedUrl(uploadUrl, file.uri, contentType);

          const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'photo';
          await mediaRepo.confirmPostMedia(postId, key, mediaType, i);

          setProgress({ current: i + 1, total: files.length });
        }
        return true;
      } catch (e) {
        logger.warn('usePostUpload', 'Failed to upload media', e);
        return false;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const uploadStory = useCallback(
    async (file: { uri: string; type: string; fileSize: number }): Promise<boolean> => {
      setUploading(true);
      try {
        const contentType = file.type as MediaContentType;
        const { uploadUrl, key } = await mediaRepo.getStoryUploadUrl(contentType, file.fileSize);

        await uploadToPresignedUrl(uploadUrl, file.uri, contentType);

        const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'photo';
        await mediaRepo.confirmStory(key, mediaType);

        return true;
      } catch (e) {
        logger.warn('usePostUpload', 'Failed to upload story', e);
        return false;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return {
    uploading,
    progress,
    createPost,
    uploadMedia,
    uploadStory,
  };
}
