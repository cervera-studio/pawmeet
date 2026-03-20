import type { SupportTicket } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
};

export function createAssignSupportTicket({ supportRepo }: Deps) {
  return async (
    adminId: string,
    ticketId: string,
    assignToAdminId: string | null,
  ): Promise<Result<SupportTicket>> => {
    const ticket = await supportRepo.getTicketById(ticketId);
    if (!ticket) {
      return fail(new AppError('TICKET_NOT_FOUND', 'Ticket di supporto non trovato', 404));
    }

    const updated = await supportRepo.assignTicket(ticketId, assignToAdminId);

    // Insert system message about assignment change
    const assignmentText = assignToAdminId
      ? 'Ticket assegnato a un operatore'
      : 'Assegnazione ticket rimossa';

    await supportRepo.addMessage({
      ticketId,
      senderType: 'system',
      senderId: null,
      content: assignmentText,
      isInternal: true,
    });

    logger.info('AssignSupportTicket', 'Ticket assigned', {
      adminId,
      ticketId,
      assignedTo: assignToAdminId,
    });

    return succeed(updated);
  };
}
