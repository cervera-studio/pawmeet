export interface AdminStory {
  id: string;
  mediaUrl: string;
  mediaType: string;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
  authorId: string;
  authorName: string | null;
}

export interface AdminStoryPage {
  data: AdminStory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StoryAdminRepository {
  listStories(params: { page: number; pageSize: number }): Promise<AdminStoryPage>;
  deleteStory(storyId: string): Promise<void>;
}
