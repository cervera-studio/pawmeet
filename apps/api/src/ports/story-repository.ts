import type { Story, StoryGroup, StoryView } from '@pawmeet/types';

export interface CreateStoryInput {
  authorId: string;
  mediaUrl: string;
  mediaType: string;
  thumbnailUrl: string | null;
  expiresAt: Date;
}

export interface StoryRepository {
  createStory(input: CreateStoryInput): Promise<Story>;
  findById(id: string): Promise<Story | null>;
  findActiveStoriesForFeed(userId: string): Promise<StoryGroup[]>;
  countTodayByAuthor(authorId: string): Promise<number>;
  addView(storyId: string, viewerId: string): Promise<StoryView | null>;
  incrementViewCount(storyId: string): Promise<void>;
  deleteExpiredStories(): Promise<{ deletedCount: number; mediaUrls: string[] }>;
  getViewers(
    storyId: string,
  ): Promise<Array<{ id: string; displayName: string; avatarUrl: string | null; viewedAt: Date }>>;
}
