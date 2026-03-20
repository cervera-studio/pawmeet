import type { SupportMessage } from '@pawmeet/types';
import { AppError, fail, type Result, succeed, WS_EVENT } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { sanitizeContent } from '../lib/sanitize.js';
import type { SupportRepository } from '../ports/support-repository.js';
import { sendToUser } from '../ws/registry.js';

type Deps = {
  supportRepo: SupportRepository;
};

export function createSendSupportMessage({ supportRepo }: Deps) {
  return async (
    userId: string,
    ticketId: string,
    content: string,
  ): Promise<Result<SupportMessage>> => {
    const ticket = await supportRepo.getTicketByIdForUser(ticketId, userId);
    if (!ticket) {
      return fail(new AppError('TICKET_NOT_FOUND', 'Ticket di supporto non trovato', 404));
    }

    if (ticket.status === 'closed') {
      return fail(
        new AppError('TICKET_CLOSED', 'Il ticket è chiuso e non accetta nuovi messaggi', 400),
      );
    }

    const sanitizedContent = sanitizeContent(content);

    const message = await supportRepo.addMessage({
      ticketId,
      senderType: 'user',
      senderId: userId,
      content: sanitizedContent,
    });

    // Reopen ticket if it was resolved
    if (ticket.status === 'resolved') {
      await supportRepo.updateStatus(ticketId, 'open');
      logger.info('SendSupportMessage', 'Ticket reopened by user message', { ticketId, userId });
    }

    // Broadcast to user's other devices for multi-device sync
    sendToUser(userId, {
      type: WS_EVENT.SUPPORT_NEW_MESSAGE,
      payload: { ticketId, message },
    });

    logger.info('SendSupportMessage', 'Support message sent', { userId, ticketId });

    return succeed(message);
  };
}
