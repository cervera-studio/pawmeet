import type { ContentType, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createRemoveContentReaction({ feedRepo }: Deps) {
  return async (
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<Result<void>> => {
    await feedRepo.removeReaction(contentType, contentId, userId, emoji);
    return succeed(undefined);
  };
}
