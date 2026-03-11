import type { Result, StoryGroup } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { StoryRepository } from '../ports/index.js';

type Deps = {
  storyRepo: StoryRepository;
};

export function createGetFeedStories({ storyRepo }: Deps) {
  return async (userId: string): Promise<Result<{ groups: StoryGroup[] }>> => {
    const groups = await storyRepo.findActiveStoriesForFeed(userId);
    return succeed({ groups });
  };
}
