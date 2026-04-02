import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createRemovePostTag({ feedRepo }: Deps) {
  return async (tagId: string, userId: string): Promise<Result<{ removed: boolean }>> => {
    const tag = await feedRepo.findTagById(tagId);
    if (!tag) {
      return fail(new AppError('TAG_NOT_FOUND', 'Tag not found', 404));
    }

    const post = await feedRepo.findPostById(tag.postId);
    if (!post) {
      return fail(new AppError('POST_NOT_FOUND', 'Post not found', 404));
    }

    // Author or tagged user can remove a tag
    const isAuthor = post.authorId === userId;
    const isTaggedUser = tag.taggedUserId === userId;
    if (!(isAuthor || isTaggedUser)) {
      return fail(new AppError('FORBIDDEN', ERROR_MESSAGES.TAG_REMOVE_FORBIDDEN, 403));
    }

    await feedRepo.removeTags([tagId]);
    return succeed({ removed: true });
  };
}
