import type { SupportTicket, SupportTicketStatus } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
};

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Aperto',
  in_progress: 'In lavorazione',
  resolved: 'Risolto',
  closed: 'Chiuso',
};

export function createUpdateSupportTicketStatus({ supportRepo }: Deps) {
  return async (
    adminId: string,
    ticketId: string,
    status: SupportTicketStatus,
  ): Promise<Result<{ ticket: SupportTicket; messageCount: number }>> => {
    const ticket = await supportRepo.getTicketById(ticketId);
    if (!ticket) {
      return fail(new AppError('TICKET_NOT_FOUND', 'Ticket di supporto non trovato', 404));
    }

    if (ticket.status === status) {
      return fail(new AppError('STATUS_UNCHANGED', 'Il ticket è già in questo stato', 400));
    }

    const updatedTicket = await supportRepo.updateStatus(ticketId, status);

    // Insert system message about status change
    const label = STATUS_LABELS[status];
    await supportRepo.addMessage({
      ticketId,
      senderType: 'system',
      senderId: null,
      content: `Stato del ticket aggiornato a: ${label}`,
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
