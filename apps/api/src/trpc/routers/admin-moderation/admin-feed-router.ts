import { ADMIN_WS_EVENT } from '@pawmeet/types';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { logAdminAction, RESOURCE_TYPE } from '../../../lib/admin-audit.js';
import { AdminRole, requireRole } from '../../../lib/admin-permissions.js';
import { paginate } from '../../../lib/pagination.js';
import { sendToAllAdmins } from '../../../ws/admin-ws.js';
import { router } from '../../trpc.js';
import { createAdminProcedure } from '../admin-procedure.js';
import { maskEmail } from './helpers.js';
import type { ModerationRouterDeps } from './types.js';

const listFeedPostsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().optional(),
});

const updatePostModerationSchema = z.object({
  postId: z.uuid(),
  status: z.enum(['approved', 'rejected']),
});

export function createAdminFeedRouter(deps: ModerationRouterDeps) {
  const adminProcedure = createAdminProcedure();
  const { adminDataRepo, auditLogRepo } = deps;

  return router({
    listFeedPosts: adminProcedure.input(listFeedPostsSchema).query(async ({ input }) => {
      const result = await adminDataRepo.listFeedPosts(input);

      const mediaByPost = new Map<string, typeof result.media>();
      for (const m of result.media) {
        const list = mediaByPost.get(m.postId) ?? [];
        list.push(m);
        mediaByPost.set(m.postId, list);
      }

      const reportCountMap = new Map(result.reportCounts.map((r) => [r.contentId, r.count]));

      return paginate(
        {
          data: result.posts.map((p) => ({
            ...p,
            authorEmail: maskEmail(p.authorEmail),
            media: mediaByPost.get(p.id) ?? [],
            reportCount: reportCountMap.get(p.id) ?? 0,
          })),
          total: result.total,
        },
        input,
      );
    }),

    updatePostModeration: adminProcedure
      .input(updatePostModerationSchema)
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const post = await adminDataRepo.findPostById(input.postId);
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
        }

        await adminDataRepo.updatePostModeration(input.postId, input.status);

        if (input.status === 'rejected') {
          await adminDataRepo.softDeletePost(input.postId);
        }

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: `post.${input.status}`,
          resourceType: RESOURCE_TYPE.post,
          resourceId: input.postId,
          changes: {
            before: { moderationStatus: post.moderationStatus },
            after: { moderationStatus: input.status },
          },
        });

        sendToAllAdmins({
          type: ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED,
          payload: {
            queue: 'feed',
            itemId: input.postId,
            action: input.status,
            adminId: ctx.userId,
          },
        });

        return { success: true };
      }),

    listStories: adminProcedure
      .input(
        z.object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }),
      )
      .query(async ({ input }) => {
        const result = await adminDataRepo.listStories(input);
        return paginate(result, input);
      }),

    deleteStory: adminProcedure
      .input(z.object({ storyId: z.uuid() }))
      .mutation(async ({ ctx, input }) => {
        requireRole(ctx.adminRole, AdminRole.Moderator);

        const story = await adminDataRepo.findStoryById(input.storyId);
        if (!story) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Story not found' });
        }

        await adminDataRepo.deleteStory(input.storyId);

        void logAdminAction(auditLogRepo, {
          adminId: ctx.userId,
          action: 'story.delete',
          resourceType: RESOURCE_TYPE.story,
          resourceId: input.storyId,
        });

        sendToAllAdmins({
          type: ADMIN_WS_EVENT.MODERATION_ITEM_ACTIONED,
          payload: {
            queue: 'stories',
            itemId: input.storyId,
            action: 'deleted',
            adminId: ctx.userId,
          },
        });

        return { success: true };
      }),

    getFeedStats: adminProcedure.query(async () => {
      return adminDataRepo.getFeedStats();
    }),
  });
}
