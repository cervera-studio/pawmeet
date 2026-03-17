import type { PostMedia } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { FeedRepository, StorageService } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
  storage: StorageService;
};

export function createConfirmPostMedia({ feedRepo, storage }: Deps) {
  return async (
    postId: string,
    userId: string,
    key: string,
    mediaType: string,
    position: number,
  ): Promise<Result<{ media: PostMedia }>> => {
    const post = await feedRepo.findPostById(postId);
    if (!post || post.authorId !== userId) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    // Strict key validation: must be exactly posts/{postId}/{filename}
    // Prevents path traversal (../) and cross-post media hijacking
    const KEY_PATTERN = /^posts\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
    if (!key.startsWith(`posts/${postId}/`) || !KEY_PATTERN.test(key)) {
      return fail(new AppError('INVALID_MEDIA_KEY', 'Chiave media non valida', 403));
    }

    const publicUrl = storage.getPublicUrl(key);

    const media = await feedRepo.addMedia({
      postId,
      url: publicUrl,
      mediaType,
      thumbnailUrl: null,
      position,
    });

    return succeed({ media });
  };
}
