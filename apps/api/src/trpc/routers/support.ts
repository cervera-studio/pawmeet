import { WS_EVENT } from '@pawmeet/types';
import {
  assignTicketSchema,
  createSupportTicketSchema,
  listSupportTicketsSchema,
  sendSupportMessageSchema,
  updateTicketStatusSchema,
} from '@pawmeet/validation';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { supportDeps } from '../../container/index.js';
import type { AdminRoleValue } from '../../lib/admin-permissions.js';
import { paginate } from '../../lib/pagination.js';
import { trackEvent } from '../../lib/track-event.js';
import { sendToUser } from '../../ws/registry.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

const getMessagesSchema = z.object({
  ticketId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

const adminReplySchema = z.object({
  ticketId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

function createAdminSupportProcedure() {
  return protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.adminRole) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
        adminRole: ctx.adminRole as AdminRoleValue,
      },
    });
  });
}

export function createSupportRouter(deps: typeof supportDeps) {
  const adminProcedure = createAdminSupportProcedure();

  return router({
    // ── User endpoints ────────────────────────────────────────────────────────

    createTicket: protectedProcedure
      .input(createSupportTicketSchema)
      .mutation(async ({ ctx, input }) => {
        const ticket = unwrapResult(
          await deps.createTicket(ctx.userId, input.subject, input.category, input.message),
        );
        trackEvent('support_ticket_created', ctx.userId, {
          category: input.category,
          source: 'mobile',
        });
        return ticket;
      }),

    listMyTickets: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listUserTickets(ctx.userId)),
    ),

    getTicketMessages: protectedProcedure.input(getMessagesSchema).query(async ({ ctx, input }) =>
      unwrapResult(
        await deps.getMessages(input.ticketId, input.cursor ?? null, input.limit, {
          userId: ctx.userId,
          isAdmin: false,
        }),
      ),
    ),

    sendMessage: protectedProcedure
      .input(sendSupportMessageSchema)
      .mutation(async ({ ctx, input }) => {
        const message = unwrapResult(
          await deps.sendMessage(ctx.userId, input.ticketId, input.content),
        );
        trackEvent('support_message_sent', ctx.userId, { ticketId: input.ticketId });
        return message;
      }),

    /** Mark admin messages as read (called by user when opening the chat) */
    markAsRead: protectedProcedure
      .input(z.object({ ticketId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        // Verify the user owns this ticket (lightweight check, no message fetch)
        const ownerUserId = await deps.getTicketOwnerUserId(input.ticketId);
        if (ownerUserId !== ctx.userId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });
        }

        const updated = await deps.markAdminMessagesRead(input.ticketId);
        return { updated };
      }),

    // ── Admin endpoints ───────────────────────────────────────────────────────

    listTickets: adminProcedure.input(listSupportTicketsSchema).query(async ({ input }) => {
      const result = unwrapResult(await deps.listTickets(input));
      return paginate(result, input);
    }),

    getTicket: adminProcedure
      .input(z.object({ ticketId: z.string().uuid() }))
      .query(async ({ input }) => {
        const result = unwrapResult(
          await deps.getMessages(input.ticketId, null, 1, {
            isAdmin: true,
          }),
        );
        return result;
      }),

    getAdminTicketMessages: adminProcedure.input(getMessagesSchema).query(async ({ input }) =>
      unwrapResult(
        await deps.getMessages(input.ticketId, input.cursor ?? null, input.limit, {
          isAdmin: true,
        }),
      ),
    ),

    reply: adminProcedure.input(adminReplySchema).mutation(async ({ ctx, input }) => {
      const message = unwrapResult(
        await deps.adminReply(ctx.userId, input.ticketId, input.content, input.isInternal),
      );
      trackEvent('support_message_sent', ctx.userId, { ticketId: input.ticketId });
      return message;
    }),

    updateStatus: adminProcedure
      .input(updateTicketStatusSchema)
      .mutation(async ({ ctx, input }) => {
        const { ticket, messageCount } = unwrapResult(
          await deps.updateStatus(ctx.userId, input.ticketId, input.status),
        );
        if (input.status === 'resolved') {
          trackEvent('support_ticket_resolved', ctx.userId, {
            ticketId: input.ticketId,
            messageCount,
          });
        }
        return ticket;
      }),

    assign: adminProcedure
      .input(assignTicketSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.assignTicket(ctx.userId, input.ticketId, input.adminId)),
      ),

    /** Mark user messages as read (called by admin when opening the ticket) */
    markAdminRead: adminProcedure
      .input(z.object({ ticketId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const updated = await deps.markUserMessagesRead(input.ticketId);

        // Notify the ticket owner that their messages have been read
        const ownerUserId = await deps.getTicketOwnerUserId(input.ticketId);
        if (ownerUserId) {
          sendToUser(ownerUserId, {
            type: WS_EVENT.SUPPORT_MESSAGES_READ,
            payload: { ticketId: input.ticketId, readAt: new Date().toISOString() },
          });
        }

        return { updated };
      }),
  });
}
