import { isFailure, isSuccess, SUPPORT_TICKET_STATUS } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { SupportRepository } from '../ports/support-repository.js';
import { createUpdateSupportTicketStatus } from './update-support-ticket-status.js';

function buildSupportRepo(overrides: Partial<SupportRepository> = {}): SupportRepository {
  return {
    createTicket: vi.fn(),
    createGuestTicket: vi.fn(),
    addMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    getTicketById: vi
      .fn()
      .mockResolvedValue({ id: 'ticket-1', status: SUPPORT_TICKET_STATUS.Open }),
    getTicketByIdForUser: vi.fn(),
    listTicketsByUser: vi.fn(),
    listTickets: vi.fn(),
    getMessages: vi.fn(),
    updateStatus: vi
      .fn()
      .mockResolvedValue({ id: 'ticket-1', status: SUPPORT_TICKET_STATUS.Resolved }),
    assignTicket: vi.fn(),
    getTicketOwnerUserId: vi.fn(),
    countMessagesByTicket: vi.fn().mockResolvedValue(5),
    markAdminMessagesRead: vi.fn(),
    markUserMessagesRead: vi.fn(),
    ...overrides,
  };
}

describe('createUpdateSupportTicketStatus', () => {
  it('updates status and returns message count', async () => {
    const supportRepo = buildSupportRepo();
    const updateStatus = createUpdateSupportTicketStatus({ supportRepo });

    const result = await updateStatus('admin-1', 'ticket-1', SUPPORT_TICKET_STATUS.Resolved);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.messageCount).toBe(5);
    expect(supportRepo.updateStatus).toHaveBeenCalledWith(
      'ticket-1',
      SUPPORT_TICKET_STATUS.Resolved,
    );
    expect(supportRepo.addMessage).toHaveBeenCalled();
  });

  it('fails with 404 when ticket not found', async () => {
    const supportRepo = buildSupportRepo({ getTicketById: vi.fn().mockResolvedValue(null) });
    const updateStatus = createUpdateSupportTicketStatus({ supportRepo });

    const result = await updateStatus('admin-1', 'ticket-1', SUPPORT_TICKET_STATUS.Resolved);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('fails with 400 when status is unchanged', async () => {
    const supportRepo = buildSupportRepo();
    const updateStatus = createUpdateSupportTicketStatus({ supportRepo });

    const result = await updateStatus('admin-1', 'ticket-1', SUPPORT_TICKET_STATUS.Open);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('STATUS_UNCHANGED');
  });
});
