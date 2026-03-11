import { markReadSchema, sendMessageSchema } from '@dogwalk/validation';
import { z } from 'zod';
import type { chatDeps } from '../../container.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

const getMessagesSchema = z.object({
  matchId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const sendMessageWithMatchSchema = z.object({
  matchId: z.string().uuid(),
  content: sendMessageSchema.shape.content,
  mediaUrl: sendMessageSchema.shape.mediaUrl,
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
      .input(sendMessageWithMatchSchema)
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(
          await deps.sendMessage(ctx.userId, input.matchId, input.content, input.mediaUrl),
        );
        trackEvent('chat_message_sent', ctx.userId, {
          messageType: input.mediaUrl ? 'image' : 'text',
          chatAgeHours: 0,
          messageCountInChat: 0,
        });
        return result;
      }),

    markMessagesRead: protectedProcedure
      .input(markReadSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.markMessagesRead(ctx.userId, input.matchId)),
      ),
  });
}
