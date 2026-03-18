import {
  addContentReactionSchema,
  addPostTagsSchema,
  confirmPostMediaSchema,
  confirmStorySchema,
  createCommentSchema,
  createPostSchema,
  createStorySchema,
  feedQuerySchema,
  likePostSchema,
  postCommentsQuerySchema,
  postMediaUploadSchema,
  removeContentReactionSchema,
  removePostTagSchema,
  reportContentSchema,
  searchByHashtagSchema,
  trendingHashtagsSchema,
  userPostsQuerySchema,
  viewStorySchema,
} from '@pawmeet/validation';
import { z } from 'zod';
import type { feedDeps } from '../../container/index.js';
import { enqueueCommentToxicityCheck } from '../../jobs/queue.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createFeedRouter(deps: typeof feedDeps) {
  return router({
    // ── Posts ────────────────────────────────────────────────────────────────

    createPost: protectedProcedure.input(createPostSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(
        await deps.createPost(ctx.userId, {
          caption: input.caption ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          walkId: input.walkId ?? null,
        }),
      );
      trackEvent('feed_post_created', ctx.userId, {
        mediaCount: 0,
        hasCaption: Boolean(input.caption),
        hasLocation: Boolean(input.latitude),
        tagCount: 0,
      });
      return result;
    }),

    deletePost: protectedProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(await deps.deletePost(input.postId, ctx.userId));
        trackEvent('feed_post_deleted', ctx.userId, {
          postAgeHours: result.postAgeHours,
          mediaCount: result.mediaCount,
        });
      }),

    postDetail: protectedProcedure
      .input(z.object({ postId: z.string().uuid() }))
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getPostDetail(input.postId, ctx.userId)),
      ),

    // ── Media upload ────────────────────────────────────────────────────────

    uploadMediaUrl: protectedProcedure
      .input(postMediaUploadSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(
          await deps.uploadPostMediaUrl(
            input.postId,
            ctx.userId,
            input.contentType,
            input.fileSize,
          ),
        ),
      ),

    confirmMedia: protectedProcedure
      .input(confirmPostMediaSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(
          await deps.confirmPostMedia(
            input.postId,
            ctx.userId,
            input.key,
            input.mediaType,
            input.position,
          ),
        ),
      ),

    // ── Feed timeline ───────────────────────────────────────────────────────

    timeline: protectedProcedure
      .input(feedQuerySchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getFeed(ctx.userId, input.cursor ?? null, input.limit)),
      ),

    userPosts: protectedProcedure
      .input(userPostsQuerySchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.getUserPosts(input.userId, ctx.userId, input.cursor ?? null, input.limit),
        ),
      ),

    // ── Likes ───────────────────────────────────────────────────────────────

    like: protectedProcedure.input(likePostSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.likePost(input.postId, ctx.userId));
      trackEvent('feed_post_liked', ctx.userId, {
        postAgeHours: result.postAgeHours,
      });
      return { liked: result.liked };
    }),

    // ── Comments ────────────────────────────────────────────────────────────

    createComment: protectedProcedure
      .input(createCommentSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(
          await deps.createComment(input.postId, ctx.userId, input.content, input.parentId ?? null),
        );
        trackEvent('feed_comment_created', ctx.userId, {
          postAgeHours: result.postAgeHours,
          isReply: Boolean(input.parentId),
        });
        enqueueCommentToxicityCheck({
          commentId: result.comment.id,
          postId: input.postId,
          authorId: ctx.userId,
          content: input.content,
        }).catch(() => {
          /* fire-and-forget */
        });
        return { comment: result.comment };
      }),

    deleteComment: protectedProcedure
      .input(z.object({ commentId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        unwrapResult(await deps.deleteComment(input.commentId, ctx.userId));
        trackEvent('feed_comment_deleted', ctx.userId, { commentAgeHours: 0 });
      }),

    getComments: protectedProcedure
      .input(postCommentsQuerySchema)
      .query(async ({ input }) =>
        unwrapResult(await deps.getPostComments(input.postId, input.cursor ?? null, input.limit)),
      ),

    // ── Stories ─────────────────────────────────────────────────────────────

    createStory: protectedProcedure
      .input(createStorySchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.createStory(ctx.userId, input.contentType, input.fileSize)),
      ),

    confirmStory: protectedProcedure.input(confirmStorySchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.confirmStory(ctx.userId, input.key, input.mediaType));
      trackEvent('feed_story_created', ctx.userId, {
        mediaType: input.mediaType,
      });
      return result;
    }),

    stories: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.getFeedStories(ctx.userId)),
    ),

    viewStory: protectedProcedure.input(viewStorySchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.viewStory(input.storyId, ctx.userId));
      trackEvent('feed_story_viewed', ctx.userId, {
        storyAgeHours: result.storyAgeHours,
      });
    }),

    storyViewers: protectedProcedure
      .input(z.object({ storyId: z.string().uuid() }))
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getStoryViewers(input.storyId, ctx.userId)),
      ),

    // ── Content reports ─────────────────────────────────────────────────────

    reportContent: protectedProcedure
      .input(reportContentSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(
          await deps.reportContent(
            ctx.userId,
            input.contentType,
            input.contentId,
            input.reason,
            input.description ?? null,
          ),
        );
        trackEvent('feed_content_reported', ctx.userId, {
          contentType: input.contentType,
          reason: input.reason,
        });
        return result;
      }),

    // ── Tags ───────────────────────────────────────────────────────────────

    addTags: protectedProcedure.input(addPostTagsSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.addPostTags(input.postId, ctx.userId, input.tags));
      trackEvent('feed_post_tagged', ctx.userId, { tagCount: input.tags.length });
      return result;
    }),

    removeTag: protectedProcedure.input(removePostTagSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.removePostTag(input.tagId, ctx.userId));
      trackEvent('feed_tag_removed', ctx.userId, {});
      return result;
    }),

    // ── Reactions ──────────────────────────────────────────────────────────

    addReaction: protectedProcedure.input(addContentReactionSchema).mutation(async (_opts) =>
      // TODO: wire to use case once infra is implemented
      ({ added: true }),
    ),

    removeReaction: protectedProcedure.input(removeContentReactionSchema).mutation(async (_opts) =>
      // TODO: wire to use case once infra is implemented
      ({ removed: true }),
    ),

    // ── Hashtags ──────────────────────────────────────────────────────────

    searchByHashtag: protectedProcedure.input(searchByHashtagSchema).query(async (_opts) =>
      // TODO: wire to repository once infra is implemented
      ({ items: [] as unknown[], nextCursor: null }),
    ),

    trendingHashtags: protectedProcedure.input(trendingHashtagsSchema).query(async (_opts) =>
      // TODO: wire to repository once infra is implemented
      ({ hashtags: [] as unknown[] }),
    ),

    // ── Walk albums ─────────────────────────────────────────────────────────

    walkAlbum: protectedProcedure
      .input(z.object({ walkId: z.string().uuid() }))
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getWalkAlbum(input.walkId, ctx.userId)),
      ),
  });
}
