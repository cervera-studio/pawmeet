import type { ApiClient } from '@pawmeet/api-client';
import type { AdminStoryPage, StoryAdminRepository } from '../interfaces/story-admin-repository';

export function createTrpcStoryAdminRepository(api: ApiClient): StoryAdminRepository {
  return {
    async listStories(params): Promise<AdminStoryPage> {
      return api.admin.listStories.query(params);
    },

    async deleteStory(storyId): Promise<void> {
      await api.admin.deleteStory.mutate({ storyId });
    },
  };
}
