import {
  isFailure,
  isSuccess,
  SUPPORT_MESSAGE_SENDER_TYPE,
  SUPPORT_TICKET_STATUS,
} from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { SupportRepository } from '../ports/support-repository.js';
import { createSendSupportMessage } from './send-support-message.js';

function buildSupportRepo(overrides: Partial<SupportRepository> = {}): SupportRepository {
  return {
    createTicket: vi.fn(),
    createGuestTicket: vi.fn(),
    addMessage: vi.fn().mockResolvedValue({
      id: 'msg-1',
      ticketId: 'ticket-1',
      senderType: SUPPORT_MESSAGE_SENDER_TYPE.User,
      senderId: 'user-1',
      content: 'Help me',
      isInternal: false,
      isRead: false,
      createdAt: new Date(),
    }),
    getTicketById: vi.fn(),
    getTicketByIdForUser: vi.fn().mockResolvedValue({
      id: 'ticket-1',
      userId: 'user-1',
      status: SUPPORT_TICKET_STATUS.Open,
    }),
    listTicketsByUser: vi.fn(),
    listTickets: vi.fn(),
    getMessages: vi.fn(),
    updateStatus: vi.fn(),
    assignTicket: vi.fn(),
    getTicketOwnerUserId: vi.fn(),
    countMessagesByTicket: vi.fn(),
    markAdminMessagesRead: vi.fn(),
    markUserMessagesRead: vi.fn(),
    ...overrides,
  };
}

describe('createSendSupportMessage', () => {
  it('sends a message to an open ticket', async () => {
    const deps = { supportRepo: buildSupportRepo() };
    const sendMessage = createSendSupportMessage(deps);

    const result = await sendMessage('user-1', 'ticket-1', 'Help me');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('msg-1');
    expect(deps.supportRepo.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 'ticket-1',
        senderType: SUPPORT_MESSAGE_SENDER_TYPE.User,
        senderId: 'user-1',
      }),
    );
  });

  it('reopens a resolved ticket when user sends a message', async () => {
    const deps = {
      supportRepo: buildSupportRepo({
        getTicketByIdForUser: vi.fn().mockResolvedValue({
          id: 'ticket-1',
          userId: 'user-1',
          status: SUPPORT_TICKET_STATUS.Resolved,
        }),
      }),
    };
    const sendMessage = createSendSupportMessage(deps);

    await sendMessage('user-1', 'ticket-1', 'Still broken');

    expect(deps.supportRepo.updateStatus).toHaveBeenCalledWith(
      'ticket-1',
      SUPPORT_TICKET_STATUS.Open,
    );
  });

  it('fails with 404 when ticket not found', async () => {
    const deps = {
      supportRepo: buildSupportRepo({
        getTicketByIdForUser: vi.fn().mockResolvedValue(null),
      }),
    };
    const sendMessage = createSendSupportMessage(deps);

    const result = await sendMessage('user-1', 'ticket-1', 'Hello');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TICKET_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with 400 when ticket is closed', async () => {
    const deps = {
      supportRepo: buildSupportRepo({
        getTicketByIdForUser: vi.fn().mockResolvedValue({
          id: 'ticket-1',
          userId: 'user-1',
          status: SUPPORT_TICKET_STATUS.Closed,
        }),
      }),
    };
    const sendMessage = createSendSupportMessage(deps);

    const result = await sendMessage('user-1', 'ticket-1', 'Hello');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TICKET_CLOSED');
    expect(result.error.status).toBe(400);
  });
});
