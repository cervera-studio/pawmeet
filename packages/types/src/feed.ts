// ── Const Objects ──────────────────────────────────────────────────────────

export const POST_MODERATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type PostModerationStatus =
  (typeof POST_MODERATION_STATUS)[keyof typeof POST_MODERATION_STATUS];

export const MEDIA_TYPE = {
  PHOTO: 'photo',
  VIDEO: 'video',
} as const;

export type MediaType = (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];

export const CONTENT_REPORT_REASON = {
  INAPPROPRIATE: 'inappropriate',
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  VIOLENCE: 'violence',
  OTHER: 'other',
} as const;

export type ContentReportReason =
  (typeof CONTENT_REPORT_REASON)[keyof typeof CONTENT_REPORT_REASON];

export const CONTENT_TYPE = {
  POST: 'post',
  COMMENT: 'comment',
  STORY: 'story',
} as const;

export type ContentType = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE];

export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  DISMISSED: 'dismissed',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

// ── Interfaces ────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  authorId: string;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  walkId: string | null;
  likesCount: number;
  commentsCount: number;
  moderationStatus: PostModerationStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostMedia {
  id: string;
  postId: string;
  url: string;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  position: number;
  moderationStatus: PostModerationStatus;
  createdAt: Date;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostTag {
  id: string;
  postId: string;
  taggedUserId: string | null;
  taggedDogId: string | null;
  createdAt: Date;
}

export interface ResolvedPostTag {
  id: string;
  taggedUser: { id: string; displayName: string; avatarUrl: string | null } | null;
  taggedDog: { id: string; name: string } | null;
}

export interface Story {
  id: string;
  authorId: string;
  mediaUrl: string;
  mediaType: MediaType;
  thumbnailUrl: string | null;
  expiresAt: Date;
  viewCount: number;
  createdAt: Date;
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewedAt: Date;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  contentType: ContentType;
  contentId: string;
  reason: ContentReportReason;
  description: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface WalkAlbum {
  id: string;
  walkId: string;
  title: string;
  isFinalized: boolean;
  createdAt: Date;
}

export interface FeedItem extends Post {
  media: PostMedia[];
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  tags: ResolvedPostTag[];
  isLikedByMe: boolean;
}

export interface StoryGroup {
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  stories: Story[];
  hasUnviewed: boolean;
}
