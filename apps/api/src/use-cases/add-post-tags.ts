import type { PostTag } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
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
      return fail(new AppError('POST_NOT_FOUND', 'Post not found', 404));
    }

    if (post.authorId !== userId) {
      return fail(new AppError('FORBIDDEN', 'Only the author can add tags', 403));
    }

    // Validate every tag has at least one target
    const hasInvalid = tags.some((t) => !(t.taggedUserId || t.taggedDogId));
    if (hasInvalid) {
      return fail(new AppError('INVALID_TAGS', 'Ogni tag deve avere un utente o un cane', 400));
    }

    // Verify tagged users/dogs are connected to the author
    const connectedUserIds = await feedRepo.getConnectedUserIds(userId);
    const connectedSet = new Set(connectedUserIds);

    for (const tag of tags) {
      if (tag.taggedUserId && !connectedSet.has(tag.taggedUserId)) {
        return fail(
          new AppError('TAG_NOT_CONNECTED', 'Puoi taggare solo utenti con cui hai un match', 403),
        );
      }
    }

    const created = await feedRepo.addTags(postId, tags);
    return succeed({ tags: created });
  };
}
