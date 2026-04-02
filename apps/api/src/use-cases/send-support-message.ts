import type { SupportMessage } from '@pawmeet/types';
import {
  AppError,
  fail,
  type Result,
  SUPPORT_MESSAGE_SENDER_TYPE,
  SUPPORT_TICKET_STATUS,
  succeed,
} from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { DOMAIN_EVENT, emit } from '../domain/events.js';
import { sanitizeContent } from '../lib/sanitize.js';
import type { SupportRepository } from '../ports/support-repository.js';

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
      return fail(new AppError('TICKET_NOT_FOUND', 'Support ticket not found', 404));
    }

    if (ticket.status === SUPPORT_TICKET_STATUS.Closed) {
      return fail(
        new AppError('TICKET_CLOSED', 'Ticket is closed and does not accept new messages', 400),
      );
    }

    const sanitizedContent = sanitizeContent(content);

    const message = await supportRepo.addMessage({
      ticketId,
      senderType: SUPPORT_MESSAGE_SENDER_TYPE.User,
      senderId: userId,
      content: sanitizedContent,
    });

    // Reopen ticket if it was resolved
    if (ticket.status === SUPPORT_TICKET_STATUS.Resolved) {
      await supportRepo.updateStatus(ticketId, SUPPORT_TICKET_STATUS.Open);
      logger.info('SendSupportMessage', 'Ticket reopened by user message', { ticketId, userId });
    }

    // Emit domain event — WS broadcast handled by listeners
    void emit({
      type: DOMAIN_EVENT.SUPPORT_MESSAGE_SENT,
      payload: { ticketId, userId, message },
      timestamp: new Date(),
    });

    logger.info('SendSupportMessage', 'Support message sent', { userId, ticketId });

    return succeed(message);
  };
}
