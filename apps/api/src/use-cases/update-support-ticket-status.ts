import type { SupportTicket, SupportTicketStatus } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import {
  ERROR_MESSAGES,
  SUPPORT_STATUS_LABELS,
  supportStatusChangeMessage,
} from '../constants/messages.js';
import type { SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
};

export function createUpdateSupportTicketStatus({ supportRepo }: Deps) {
  return async (
    adminId: string,
    ticketId: string,
    status: SupportTicketStatus,
  ): Promise<Result<{ ticket: SupportTicket; messageCount: number }>> => {
    const ticket = await supportRepo.getTicketById(ticketId);
    if (!ticket) {
      return fail(new AppError('TICKET_NOT_FOUND', 'Support ticket not found', 404));
    }

    if (ticket.status === status) {
      return fail(new AppError('STATUS_UNCHANGED', ERROR_MESSAGES.STATUS_UNCHANGED, 400));
    }

    const updatedTicket = await supportRepo.updateStatus(ticketId, status);

    // Insert system message about status change
    const label = SUPPORT_STATUS_LABELS[status];
    await supportRepo.addMessage({
      ticketId,
      senderType: 'system',
      senderId: null,
      content: supportStatusChangeMessage(label),
    });

    const messageCount = await supportRepo.countMessagesByTicket(ticketId);

    logger.info('UpdateSupportTicketStatus', 'Ticket status updated', {
      adminId,
      ticketId,
      from: ticket.status,
      to: status,
    });

    return succeed({ ticket: updatedTicket, messageCount });
  };
}
