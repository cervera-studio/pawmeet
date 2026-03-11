import type { PostTag } from '@dogwalk/types';
import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createAddPostTags({ feedRepo }: Deps) {
  return async (
    postId: string,
    userId: string,
    tags: { taggedUserId?: string | null; taggedDogId?: string | null }[],
  ): Promise<Result<{ tags: PostTag[] }>> => {
    const post = await feedRepo.findPostById(postId);
    if (!post || post.isDeleted) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    if (post.authorId !== userId) {
      return fail(new AppError('FORBIDDEN', 'Solo l\'autore può aggiungere tag', 403));
    }

    // Validate at least one target per tag
    const validTags = tags.filter((t) => t.taggedUserId || t.taggedDogId);
    if (validTags.length === 0) {
      return fail(new AppError('INVALID_TAGS', 'Ogni tag deve avere un utente o un cane', 400));
    }

    const created = await feedRepo.addTags(postId, validTags);
    return succeed({ tags: created });
  };
}
