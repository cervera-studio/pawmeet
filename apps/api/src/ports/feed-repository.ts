import type {
  FeedItem,
  Post,
  PostComment,
  PostLike,
  PostMedia,
  PostTag,
  ResolvedPostTag,
} from '@pawmeet/types';

export interface CreatePostInput {
  authorId: string;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  walkId: string | null;
}

export interface AddPostMediaInput {
  postId: string;
  url: string;
  mediaType: string;
  thumbnailUrl: string | null;
  position: number;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface CommentsPage {
  comments: (PostComment & {
    author: { id: string; displayName: string; avatarUrl: string | null };
  })[];
  nextCursor: string | null;
}

export interface FeedRepository {
  createPost(input: CreatePostInput): Promise<Post>;
  findPostById(id: string): Promise<Post | null>;
  findPostWithAuthor(id: string, currentUserId: string): Promise<FeedItem | null>;
  softDeletePost(id: string): Promise<void>;
  getFeedForUser(userId: string, cursor: string | null, limit: number): Promise<FeedPage>;
  getUserPosts(
    targetUserId: string,
    currentUserId: string,
    cursor: string | null,
    limit: number,
  ): Promise<FeedPage>;

  addMedia(input: AddPostMediaInput): Promise<PostMedia>;
  findMediaByPost(postId: string): Promise<PostMedia[]>;
  countMediaByPost(postId: string): Promise<number>;
  updateMediaModerationStatus(mediaId: string, status: 'approved' | 'rejected'): Promise<void>;

  addLike(postId: string, userId: string): Promise<PostLike>;
  removeLike(postId: string, userId: string): Promise<void>;
  hasLiked(postId: string, userId: string): Promise<boolean>;

  addComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentId: string | null;
  }): Promise<PostComment>;
  findCommentById(id: string): Promise<PostComment | null>;
  softDeleteComment(id: string): Promise<void>;
  getComments(postId: string, cursor: string | null, limit: number): Promise<CommentsPage>;

  addTags(
    postId: string,
    tags: { taggedUserId?: string | null; taggedDogId?: string | null }[],
  ): Promise<PostTag[]>;
  removeTags(tagIds: string[]): Promise<void>;
  getResolvedTags(postId: string): Promise<ResolvedPostTag[]>;
  findTagById(id: string): Promise<PostTag | null>;

  getConnectedUserIds(userId: string): Promise<string[]>;
}
