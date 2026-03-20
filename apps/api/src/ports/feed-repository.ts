import type {
  ContentReaction,
  ContentType,
  FeedItem,
  Hashtag,
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

// ── Post CRUD ──────────────────────────────────────────────────────────────────

export interface FeedPostRepository {
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
  getConnectedUserIds(userId: string): Promise<string[]>;
}

// ── Media ──────────────────────────────────────────────────────────────────────

export interface FeedMediaRepository {
  addMedia(input: AddPostMediaInput): Promise<PostMedia>;
  findMediaByPost(postId: string): Promise<PostMedia[]>;
  countMediaByPost(postId: string): Promise<number>;
  updateMediaModerationStatus(mediaId: string, status: 'approved' | 'rejected'): Promise<void>;
}

// ── Likes ──────────────────────────────────────────────────────────────────────

export interface FeedLikeRepository {
  addLike(postId: string, userId: string): Promise<PostLike>;
  removeLike(postId: string, userId: string): Promise<void>;
  hasLiked(postId: string, userId: string): Promise<boolean>;
}

// ── Comments ───────────────────────────────────────────────────────────────────

export interface FeedCommentRepository {
  addComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentId: string | null;
  }): Promise<PostComment>;
  findCommentById(id: string): Promise<PostComment | null>;
  softDeleteComment(id: string): Promise<void>;
  getComments(postId: string, cursor: string | null, limit: number): Promise<CommentsPage>;
}

// ── Tags & Reactions ───────────────────────────────────────────────────────────

export interface FeedTagRepository {
  addTags(
    postId: string,
    tags: { taggedUserId?: string | null; taggedDogId?: string | null }[],
  ): Promise<PostTag[]>;
  removeTags(tagIds: string[]): Promise<void>;
  getResolvedTags(postId: string): Promise<ResolvedPostTag[]>;
  findTagById(id: string): Promise<PostTag | null>;
}

export interface FeedReactionRepository {
  addReaction(
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<ContentReaction>;
  removeReaction(
    contentType: ContentType,
    contentId: string,
    userId: string,
    emoji: string,
  ): Promise<void>;
}

// ── Hashtag Discovery ──────────────────────────────────────────────────────────

export interface FeedHashtagRepository {
  searchPostsByHashtag(hashtag: string, cursor: string | null, limit: number): Promise<FeedPage>;
  getTrendingHashtags(limit: number): Promise<Hashtag[]>;
}

// ── Full repository (backward-compatible union of all interfaces) ──────────────

export interface FeedRepository
  extends FeedPostRepository,
    FeedMediaRepository,
    FeedLikeRepository,
    FeedCommentRepository,
    FeedTagRepository,
    FeedReactionRepository,
    FeedHashtagRepository {}
