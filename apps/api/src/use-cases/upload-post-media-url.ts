import { MAX_IMAGE_SIZE, MAX_MEDIA_PER_POST, MAX_VIDEO_SIZE } from '@pawmeet/config';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { FeedRepository, StorageService } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
  storage: StorageService;
};

export function createUploadPostMediaUrl({ feedRepo, storage }: Deps) {
  return async (
    postId: string,
    userId: string,
    contentType: string,
    fileSize: number,
  ): Promise<Result<{ uploadUrl: string; key: string }>> => {
    const post = await feedRepo.findPostById(postId);
    if (!post || post.authorId !== userId) {
      return fail(new AppError('POST_NOT_FOUND', 'Post not found', 404));
    }

    if (post.isDeleted) {
      return fail(new AppError('POST_DELETED', 'Il post è stato eliminato', 400));
    }

    const mediaCount = await feedRepo.countMediaByPost(postId);
    if (mediaCount >= MAX_MEDIA_PER_POST) {
      return fail(
        new AppError(
          'MEDIA_LIMIT_REACHED',
          `Puoi caricare al massimo ${MAX_MEDIA_PER_POST} file per post`,
          400,
        ),
      );
    }

    const isVideo = contentType.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (fileSize > maxSize) {
      return fail(
        new AppError('FILE_TOO_LARGE', `Il file supera la dimensione massima consentita`, 400),
      );
    }

    const key = storage.buildPostMediaKey(postId, contentType);
    const uploadUrl = await storage.generatePresignedUploadUrl(key, contentType);

    return succeed({ uploadUrl, key });
  };
}
