import { AppError, fail, type Result, succeed } from '@dogwalk/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createRemovePostTag({ feedRepo }: Deps) {
  return async (tagId: string, userId: string): Promise<Result<{ removed: boolean }>> => {
    const tag = await feedRepo.findTagById(tagId);
    if (!tag) {
      return fail(new AppError('TAG_NOT_FOUND', 'Tag non trovato', 404));
    }

    const post = await feedRepo.findPostById(tag.postId);
    if (!post) {
      return fail(new AppError('POST_NOT_FOUND', 'Post non trovato', 404));
    }

    // Author or tagged user can remove a tag
    const isAuthor = post.authorId === userId;
    const isTaggedUser = tag.taggedUserId === userId;
    if (!isAuthor && !isTaggedUser) {
      return fail(new AppError('FORBIDDEN', 'Non puoi rimuovere questo tag', 403));
    }

    await feedRepo.removeTags([tagId]);
    return succeed({ removed: true });
  };
}
