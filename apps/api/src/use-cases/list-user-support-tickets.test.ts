import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildSupportRepo } from '../test-utils/builders.js';
import { createListUserSupportTickets } from './list-user-support-tickets.js';

describe('listUserSupportTickets', () => {
  it('returns tickets for a user', async () => {
    const tickets = [
      { id: 'ticket-1', userId: 'user-1', subject: 'Help', category: 'general', status: 'open' },
    ];
    const supportRepo = buildSupportRepo({
      listTicketsByUser: vi.fn().mockResolvedValue(tickets),
    });
    const listTickets = createListUserSupportTickets({ supportRepo });

    const result = await listTickets('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(tickets);
    expect(supportRepo.listTicketsByUser).toHaveBeenCalledWith('user-1');
  });
});
