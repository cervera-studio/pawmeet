import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { SupportRepository } from '../ports/support-repository.js';
import { buildEmailService } from '../test-utils/builders.js';
import { createCreateSupportTicket } from './create-support-ticket.js';

function buildSupportRepo(): SupportRepository {
  return {
    createTicket: vi.fn().mockResolvedValue({ id: 'ticket-1', userId: 'user-1', status: 'open' }),
    createGuestTicket: vi.fn(),
    addMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    getTicketById: vi.fn(),
    getTicketByIdForUser: vi.fn(),
    listTicketsByUser: vi.fn(),
    listTickets: vi.fn(),
    getMessages: vi.fn(),
    updateStatus: vi.fn(),
    assignTicket: vi.fn(),
    getTicketOwnerUserId: vi.fn(),
    countMessagesByTicket: vi.fn(),
    markAdminMessagesRead: vi.fn(),
    markUserMessagesRead: vi.fn(),
  };
}

describe('createCreateSupportTicket', () => {
  it('creates ticket with initial message', async () => {
    const supportRepo = buildSupportRepo();
    const emailService = {
      ...buildEmailService(),
      sendSupportTicketNotification: vi.fn().mockResolvedValue(undefined),
    };
    const createTicket = createCreateSupportTicket({ supportRepo, emailService });

    const result = await createTicket('user-1', 'Bug report', 'bug', 'App crashes on start');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('ticket-1');
    expect(supportRepo.createTicket).toHaveBeenCalled();
    expect(supportRepo.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 'ticket-1', senderType: 'user', senderId: 'user-1' }),
    );
  });
});
