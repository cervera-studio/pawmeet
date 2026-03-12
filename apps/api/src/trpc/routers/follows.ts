import {
  blockUserSchema,
  followUserSchema,
  getFollowStatusSchema,
  listFollowsSchema,
  searchUsersSchema,
  unblockUserSchema,
  unfollowUserSchema,
} from '@pawmeet/validation';
import type { followDeps } from '../../container.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createFollowsRouter(deps: typeof followDeps) {
  return router({
    follow: protectedProcedure.input(followUserSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.followUser(ctx.userId, input.targetUserId));
      trackEvent('social_follow_created', ctx.userId, {
        isReciprocal: false,
      });
      return result;
    }),

    unfollow: protectedProcedure.input(unfollowUserSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.unfollowUser(ctx.userId, input.targetUserId));
      trackEvent('social_follow_removed', ctx.userId, {
        wasMutual: false,
        followAgeDays: 0,
      });
      return result;
    }),

    listFollowers: protectedProcedure
      .input(listFollowsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.listFollowers(input.userId ?? ctx.userId, input.limit, input.offset),
        ),
      ),

    listFollowing: protectedProcedure
      .input(listFollowsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.listFollowing(input.userId ?? ctx.userId, input.limit, input.offset),
        ),
      ),

    listFriends: protectedProcedure
      .input(listFollowsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.listFriends(input.userId ?? ctx.userId, input.limit, input.offset)),
      ),

    getFollowStatus: protectedProcedure
      .input(getFollowStatusSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getFollowStatus(ctx.userId, input.targetUserId)),
      ),

    search: protectedProcedure
      .input(searchUsersSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.searchUsers(ctx.userId, input.query, input.limit, input.offset)),
      ),

    block: protectedProcedure.input(blockUserSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.blockUser(ctx.userId, input.targetUserId));
      trackEvent('social_user_blocked', ctx.userId, {
        hadPriorFollow: false,
      });
      return result;
    }),

    unblock: protectedProcedure.input(unblockUserSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.unblockUser(ctx.userId, input.targetUserId));
      trackEvent('social_user_unblocked', ctx.userId, {});
      return result;
    }),

    listBlocked: protectedProcedure
      .input(listFollowsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.listBlocked(ctx.userId, input.limit, input.offset)),
      ),
  });
}
