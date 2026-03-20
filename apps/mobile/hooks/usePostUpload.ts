import type { MediaType } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { api } from '@/lib/trpc';

interface UploadProgress {
  current: number;
  total: number;
}

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
        const result = await api.feed.createPost.mutate(input);
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

          // 1. Get presigned URL
          const { uploadUrl, key } = await api.feed.uploadMediaUrl.mutate({
            postId,
            contentType: file.type as
              | 'image/jpeg'
              | 'image/png'
              | 'image/webp'
              | 'video/mp4'
              | 'video/quicktime',
            fileSize: file.fileSize,
          });

          // 2. Upload to R2
          const response = await fetch(file.uri);
          const blob = await response.blob();
          await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': file.type },
          });

          // 3. Confirm upload
          const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'photo';
          await api.feed.confirmMedia.mutate({
            postId,
            key,
            mediaType,
            position: i,
          });

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
        // 1. Get presigned URL
        const { uploadUrl, key } = await api.feed.createStory.mutate({
          contentType: file.type as
            | 'image/jpeg'
            | 'image/png'
            | 'image/webp'
            | 'video/mp4'
            | 'video/quicktime',
          fileSize: file.fileSize,
        });

        // 2. Upload to R2
        const response = await fetch(file.uri);
        const blob = await response.blob();
        await fetch(uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': file.type },
        });

        // 3. Confirm story
        const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'photo';
        await api.feed.confirmStory.mutate({
          key,
          mediaType,
        });

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
