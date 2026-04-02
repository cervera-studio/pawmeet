import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { SupportRepository } from '../ports/support-repository.js';
import { createAssignSupportTicket } from './assign-support-ticket.js';

function buildSupportRepo(overrides: Partial<SupportRepository> = {}): SupportRepository {
  return {
    createTicket: vi.fn(),
    createGuestTicket: vi.fn(),
    addMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    getTicketById: vi.fn().mockResolvedValue({ id: 'ticket-1', status: 'open' }),
    getTicketByIdForUser: vi.fn(),
    listTicketsByUser: vi.fn(),
    listTickets: vi.fn(),
    getMessages: vi.fn(),
    updateStatus: vi.fn(),
    assignTicket: vi.fn().mockResolvedValue({ id: 'ticket-1', assignedTo: 'admin-2' }),
    getTicketOwnerUserId: vi.fn(),
    countMessagesByTicket: vi.fn(),
    markAdminMessagesRead: vi.fn(),
    markUserMessagesRead: vi.fn(),
    ...overrides,
  };
}

describe('createAssignSupportTicket', () => {
  it('assigns ticket and adds system message', async () => {
    const supportRepo = buildSupportRepo();
    const assign = createAssignSupportTicket({ supportRepo });

    const result = await assign('admin-1', 'ticket-1', 'admin-2');

    expect(isSuccess(result)).toBe(true);
    expect(supportRepo.assignTicket).toHaveBeenCalledWith('ticket-1', 'admin-2');
    expect(supportRepo.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderType: 'system', isInternal: true }),
    );
  });

  it('handles unassignment (null)', async () => {
    const supportRepo = buildSupportRepo();
    const assign = createAssignSupportTicket({ supportRepo });

    await assign('admin-1', 'ticket-1', null);

    expect(supportRepo.assignTicket).toHaveBeenCalledWith('ticket-1', null);
  });

  it('fails with 404 when ticket not found', async () => {
    const supportRepo = buildSupportRepo({ getTicketById: vi.fn().mockResolvedValue(null) });
    const assign = createAssignSupportTicket({ supportRepo });

    const result = await assign('admin-1', 'ticket-1', 'admin-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TICKET_NOT_FOUND');
  });
});
