import { z } from 'zod';
import type { chatDeps } from '../../container.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

const getMessagesSchema = z.object({
  matchId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const sendMessageSchema = z.object({
  matchId: z.string().uuid(),
  content: z.string().max(2000),
  mediaUrl: z.string().url().optional(),
});

const markReadSchema = z.object({
  matchId: z.string().uuid(),
});

export function createChatRouter(deps: typeof chatDeps) {
  return router({
    listConversations: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listConversations(ctx.userId)),
    ),

    getMessages: protectedProcedure
      .input(getMessagesSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getMessages(ctx.userId, input.matchId, input.cursor, input.limit)),
      ),

    sendMessage: protectedProcedure
      .input(sendMessageSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(
          await deps.sendMessage(ctx.userId, input.matchId, input.content, input.mediaUrl),
        ),
      ),

    markMessagesRead: protectedProcedure
      .input(markReadSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.markMessagesRead(ctx.userId, input.matchId)),
      ),
  });
}
