import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { PaginatedMessages, SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
};

export function createGetSupportTicketMessages({ supportRepo }: Deps) {
  return async (
    ticketId: string,
    cursor: string | null,
    limit: number,
    options: { userId?: string; isAdmin: boolean },
  ): Promise<Result<PaginatedMessages>> => {
    // Verify access
    if (options.isAdmin) {
      const ticket = await supportRepo.getTicketById(ticketId);
      if (!ticket) {
        return fail(new AppError('TICKET_NOT_FOUND', 'Ticket di supporto non trovato', 404));
      }
    } else if (options.userId) {
      const ticket = await supportRepo.getTicketByIdForUser(ticketId, options.userId);
      if (!ticket) {
        return fail(new AppError('TICKET_NOT_FOUND', 'Ticket di supporto non trovato', 404));
      }
    } else {
      return fail(new AppError('UNAUTHORIZED', 'Accesso non autorizzato', 401));
    }

    const includeInternal = options.isAdmin;
    const result = await supportRepo.getMessages(ticketId, cursor, limit, includeInternal);

    return succeed(result);
  };
}
