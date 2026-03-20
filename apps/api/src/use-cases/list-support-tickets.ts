import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type {
  ListTicketsQuery,
  PaginatedTickets,
  SupportRepository,
} from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
};

export function createListSupportTickets({ supportRepo }: Deps) {
  return async (query: ListTicketsQuery): Promise<Result<PaginatedTickets>> => {
    const result = await supportRepo.listTickets(query);
    return succeed(result);
  };
}
