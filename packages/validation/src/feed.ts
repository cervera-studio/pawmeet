import { z } from 'zod';

export const createPostSchema = z.object({
  caption: z.string().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  walkId: z.string().uuid().nullable().optional(),
});

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(500),
  parentId: z.string().uuid().nullable().optional(),
});

export const likePostSchema = z.object({
  postId: z.string().uuid(),
});

export const postMediaUploadSchema = z.object({
  postId: z.string().uuid(),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  fileSize: z.number().int().min(1),
});

export const confirmPostMediaSchema = z.object({
  postId: z.string().uuid(),
  key: z.string().min(1),
  mediaType: z.enum(['photo', 'video']),
  position: z.number().int().min(0).max(9),
});

export const createStorySchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  fileSize: z.number().int().min(1),
});

export const confirmStorySchema = z.object({
  key: z.string().min(1),
  mediaType: z.enum(['photo', 'video']),
});

export const reportContentSchema = z.object({
  contentType: z.enum(['post', 'comment', 'story']),
  contentId: z.string().uuid(),
  reason: z.enum(['inappropriate', 'spam', 'harassment', 'violence', 'other']),
  description: z.string().max(500).nullable().optional(),
});

export const reviewReportSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(['reviewed', 'dismissed']),
});

export const userPostsQuerySchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const postCommentsQuerySchema = z.object({
  postId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const viewStorySchema = z.object({
  storyId: z.string().uuid(),
});

export const addPostTagsSchema = z.object({
  postId: z.string().uuid(),
  tags: z
    .array(
      z.object({
        taggedUserId: z.string().uuid().nullable().optional(),
        taggedDogId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const removePostTagSchema = z.object({
  tagId: z.string().uuid(),
});
