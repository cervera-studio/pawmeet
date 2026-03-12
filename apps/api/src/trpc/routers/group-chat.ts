import {
  getGroupMessagesSchema,
  markGroupMessagesReadSchema,
  sendGroupMessageSchema,
} from '@pawmeet/validation';
import type { groupChatDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createGroupChatRouter(deps: typeof groupChatDeps) {
  return router({
    listConversations: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listGroupConversations(ctx.userId)),
    ),

    getMessages: protectedProcedure
      .input(getGroupMessagesSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.getGroupMessages(ctx.userId, input.eventId, input.cursor, input.limit),
        ),
      ),

    sendMessage: protectedProcedure
      .input(sendGroupMessageSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(
          await deps.sendGroupMessage(ctx.userId, input.eventId, input.content, input.mediaUrl),
        ),
      ),

    markMessagesRead: protectedProcedure
      .input(markGroupMessagesReadSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.markGroupMessagesRead(ctx.userId, input.eventId)),
      ),
  });
}
