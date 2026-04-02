import type { ApiClient } from '@pawmeet/api-client';
import type { ContentReportReason } from '@pawmeet/types';
import type { FeedRepository } from '../interfaces';

export function createTrpcFeedRepository(api: ApiClient): FeedRepository {
  return {
    async createPost(input) {
      return api.feed.createPost.mutate(input);
    },
    async trendingHashtags(limit) {
      return api.feed.trendingHashtags.query({ limit });
    },
    async timeline(cursor?, limit = 20) {
      return api.feed.timeline.query({ cursor, limit });
    },
    async stories() {
      return api.feed.stories.query();
    },
    async like(postId) {
      return api.feed.like.mutate({ postId });
    },
    async createComment(postId, content, parentId?) {
      return api.feed.createComment.mutate({ postId, content, parentId });
    },
    async getComments(postId, cursor?, limit = 20) {
      return api.feed.getComments.query({ postId, cursor, limit });
    },
    async deletePost(postId) {
      await api.feed.deletePost.mutate({ postId });
    },
    async deleteComment(commentId) {
      await api.feed.deleteComment.mutate({ commentId });
    },
    async viewStory(storyId) {
      await api.feed.viewStory.mutate({ storyId });
    },
    async reportContent(contentType, contentId, reason: ContentReportReason) {
      await api.feed.reportContent.mutate({ contentType, contentId, reason });
    },
    async addReaction(contentType, contentId, emoji) {
      await api.feed.addReaction.mutate({ contentType, contentId, emoji });
    },
    async removeReaction(contentType, contentId, emoji) {
      await api.feed.removeReaction.mutate({ contentType, contentId, emoji });
    },
  };
}
