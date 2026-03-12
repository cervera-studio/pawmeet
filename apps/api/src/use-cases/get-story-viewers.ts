import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { StoryRepository } from '../ports/index.js';

type Deps = {
  storyRepo: StoryRepository;
};

type StoryViewer = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  viewedAt: Date;
};

export function createGetStoryViewers({ storyRepo }: Deps) {
  return async (storyId: string, userId: string): Promise<Result<StoryViewer[]>> => {
    const story = await storyRepo.findById(storyId);
    if (!story) {
      return fail(new AppError('STORY_NOT_FOUND', 'Storia non trovata', 404));
    }

    // Only the story author can see who viewed it
    if (story.authorId !== userId) {
      return fail(new AppError('FORBIDDEN', "Solo l'autore può vedere chi ha visualizzato", 403));
    }

    const viewers = await storyRepo.getViewers(storyId);
    return succeed(viewers);
  };
}
