import type { ContentReportReason } from '@pawmeet/types';

export interface FeedItem {
  id: string;
  [key: string]: unknown;
}

export interface StoryGroup {
  [key: string]: unknown;
}

export interface FeedComment {
  [key: string]: unknown;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface CommentsPage {
  comments: FeedComment[];
  nextCursor: string | null;
}

export interface CreatePostInput {
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  walkId: string | null;
}

export interface TrendingHashtag {
  name: string;
  usageCount: number;
}

export interface FeedRepository {
  createPost(input: CreatePostInput): Promise<{ post: FeedItem }>;
  trendingHashtags(limit: number): Promise<{ hashtags: TrendingHashtag[] }>;
  timeline(cursor?: string, limit?: number): Promise<FeedPage>;
  stories(): Promise<{ groups: StoryGroup[] }>;
  like(postId: string): Promise<{ liked: boolean }>;
  createComment(
    postId: string,
    content: string,
    parentId?: string,
  ): Promise<{ comment: FeedComment }>;
  getComments(postId: string, cursor?: string, limit?: number): Promise<CommentsPage>;
  deletePost(postId: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
  viewStory(storyId: string): Promise<void>;
  reportContent(
    contentType: 'post' | 'comment' | 'story',
    contentId: string,
    reason: ContentReportReason,
  ): Promise<void>;
  addReaction(
    contentType: 'post' | 'comment' | 'story',
    contentId: string,
    emoji: string,
  ): Promise<void>;
  removeReaction(
    contentType: 'post' | 'comment' | 'story',
    contentId: string,
    emoji: string,
  ): Promise<void>;
}
