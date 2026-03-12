import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { StoryRepository } from '../ports/index.js';

type Deps = {
  storyRepo: StoryRepository;
};

export function createViewStory({ storyRepo }: Deps) {
  return async (storyId: string, userId: string): Promise<Result<{ storyAgeHours: number }>> => {
    const story = await storyRepo.findById(storyId);
    if (!story) {
      return fail(new AppError('STORY_NOT_FOUND', 'Storia non trovata', 404));
    }

    if (story.expiresAt < new Date()) {
      return fail(new AppError('STORY_EXPIRED', 'La storia è scaduta', 410));
    }

    // Don't count views on own stories
    if (story.authorId !== userId) {
      const view = await storyRepo.addView(storyId, userId);
      if (view) {
        await storyRepo.incrementViewCount(storyId);
      }
    }

    const storyAgeHours = Math.floor(
      (Date.now() - new Date(story.createdAt).getTime()) / (1000 * 60 * 60),
    );

    return succeed({ storyAgeHours });
  };
}
