import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { SupportRepository } from '../ports/support-repository.js';
import { createGetSupportTicketMessages } from './get-support-ticket-messages.js';

function buildSupportRepo(overrides: Partial<SupportRepository> = {}): SupportRepository {
  return {
    createTicket: vi.fn(),
    createGuestTicket: vi.fn(),
    addMessage: vi.fn(),
    getTicketById: vi.fn().mockResolvedValue({ id: 'ticket-1' }),
    getTicketByIdForUser: vi.fn().mockResolvedValue({ id: 'ticket-1', userId: 'user-1' }),
    listTicketsByUser: vi.fn(),
    listTickets: vi.fn(),
    getMessages: vi.fn().mockResolvedValue({ messages: [], nextCursor: null, hasMore: false }),
    updateStatus: vi.fn(),
    assignTicket: vi.fn(),
    getTicketOwnerUserId: vi.fn(),
    countMessagesByTicket: vi.fn(),
    markAdminMessagesRead: vi.fn(),
    markUserMessagesRead: vi.fn(),
    ...overrides,
  };
}

describe('createGetSupportTicketMessages', () => {
  it('returns messages for admin', async () => {
    const deps = { supportRepo: buildSupportRepo() };
    const getMessages = createGetSupportTicketMessages(deps);

    const result = await getMessages('ticket-1', null, 20, { isAdmin: true });

    expect(isSuccess(result)).toBe(true);
    expect(deps.supportRepo.getMessages).toHaveBeenCalledWith('ticket-1', null, 20, true);
  });

  it('returns messages for ticket owner (no internal)', async () => {
    const deps = { supportRepo: buildSupportRepo() };
    const getMessages = createGetSupportTicketMessages(deps);

    const result = await getMessages('ticket-1', null, 20, {
      isAdmin: false,
      userId: 'user-1',
    });

    expect(isSuccess(result)).toBe(true);
    expect(deps.supportRepo.getMessages).toHaveBeenCalledWith('ticket-1', null, 20, false);
  });

  it('fails with 404 when admin accesses nonexistent ticket', async () => {
    const deps = {
      supportRepo: buildSupportRepo({
        getTicketById: vi.fn().mockResolvedValue(null),
      }),
    };
    const getMessages = createGetSupportTicketMessages(deps);

    const result = await getMessages('ticket-1', null, 20, { isAdmin: true });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('fails with 404 when user accesses other user ticket', async () => {
    const deps = {
      supportRepo: buildSupportRepo({
        getTicketByIdForUser: vi.fn().mockResolvedValue(null),
      }),
    };
    const getMessages = createGetSupportTicketMessages(deps);

    const result = await getMessages('ticket-1', null, 20, {
      isAdmin: false,
      userId: 'user-2',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('fails with 401 when no userId and not admin', async () => {
    const deps = { supportRepo: buildSupportRepo() };
    const getMessages = createGetSupportTicketMessages(deps);

    const result = await getMessages('ticket-1', null, 20, { isAdmin: false });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('UNAUTHORIZED');
    expect(result.error.status).toBe(401);
  });
});
