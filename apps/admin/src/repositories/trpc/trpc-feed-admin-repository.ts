import type { ApiClient } from '@dogwalk/api-client';
import type {
  FeedAdminRepository,
  FeedPostPage,
  FeedStats,
} from '../interfaces/feed-admin-repository';

export function createTrpcFeedAdminRepository(api: ApiClient): FeedAdminRepository {
  return {
    async listPosts(params): Promise<FeedPostPage> {
      return api.admin.listFeedPosts.query(params);
    },

    async updatePostModeration(postId, status): Promise<void> {
      await api.admin.updatePostModeration.mutate({ postId, status });
    },

    async getFeedStats(): Promise<FeedStats> {
      return api.admin.getFeedStats.query();
    },
  };
}
