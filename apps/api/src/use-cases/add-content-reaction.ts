import type { ContentReaction, ContentType, Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { FeedRepository } from '../ports/index.js';

type Deps = {
  feedRepo: FeedRepository;
};

export function createAddContentReaction({ feedRepo }: Deps) {
  return async (
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<Result<{ reaction: ContentReaction }>> => {
    try {
      const reaction = await feedRepo.addReaction(contentType, contentId, userId, emoji);
      return succeed({ reaction });
    } catch (err) {
      // Unique constraint violation → reaction already exists
      if (err instanceof Error && err.message.includes('unique')) {
        return fail(new AppError('REACTION_ALREADY_EXISTS', 'Reazione già presente', 409));
      }
      const message = err instanceof Error ? err.message : 'Errore imprevisto';
      return fail(new AppError('REACTION_FAILED', message, 500));
    }
  };
}
