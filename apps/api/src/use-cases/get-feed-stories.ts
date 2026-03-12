import type { Result, StoryGroup } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
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
