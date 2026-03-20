import type { SupportTicket } from '@pawmeet/types';
import { type Result, succeed } from '@pawmeet/types';
import type { SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
};

export function createListUserSupportTickets({ supportRepo }: Deps) {
  return async (userId: string): Promise<Result<SupportTicket[]>> => {
    const tickets = await supportRepo.listTicketsByUser(userId);
    return succeed(tickets);
  };
}
