import type { SupportMessage } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { DOMAIN_EVENT, emit } from '../domain/events.js';
import { sanitizeContent } from '../lib/sanitize.js';
import type { SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
};

export function createAdminReplySupportTicket({ supportRepo }: Deps) {
  return async (
    adminId: string,
    ticketId: string,
    content: string,
    isInternal: boolean,
  ): Promise<Result<SupportMessage>> => {
    const ticket = await supportRepo.getTicketById(ticketId);
    if (!ticket) {
      return fail(new AppError('TICKET_NOT_FOUND', 'Support ticket not found', 404));
    }

    const sanitizedContent = sanitizeContent(content);

    const message = await supportRepo.addMessage({
      ticketId,
      senderType: 'admin',
      senderId: adminId,
      content: sanitizedContent,
      isInternal,
    });

    // Set status to in_progress if currently open
    if (ticket.status === 'open') {
      await supportRepo.updateStatus(ticketId, 'in_progress');
    }

    // Emit domain event — WS broadcast and push notifications handled by listeners
    void emit({
      type: DOMAIN_EVENT.SUPPORT_REPLY_SENT,
      payload: {
        ticketId,
        userId: ticket.userId,
        message,
        sanitizedContent,
        isInternal,
      },
      timestamp: new Date(),
    });

    logger.info('AdminReplySupportTicket', 'Admin replied to support ticket', {
      adminId,
      ticketId,
      isInternal,
    });

    return succeed(message);
  };
}
