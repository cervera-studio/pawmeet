export interface FeedPostMedia {
  id: string;
  postId: string;
  url: string;
  mediaType: string;
  thumbnailUrl: string | null;
}

export interface FeedPost {
  id: string;
  caption: string | null;
  moderationStatus: string;
  likesCount: number;
  commentsCount: number;
  isDeleted: boolean;
  createdAt: string;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  media: FeedPostMedia[];
  reportCount: number;
}

export interface FeedPostPage {
  data: FeedPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FeedStats {
  totalPosts: number;
  pendingPosts: number;
  rejectedPosts: number;
  totalStories: number;
  pendingReports: number;
}

export interface FeedAdminRepository {
  listPosts(params: {
    page: number;
    pageSize: number;
    status?: 'pending' | 'approved' | 'rejected';
    search?: string;
  }): Promise<FeedPostPage>;

  updatePostModeration(postId: string, status: 'approved' | 'rejected'): Promise<void>;

  getFeedStats(): Promise<FeedStats>;
}
