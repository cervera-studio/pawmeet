import type { SupportMessage, SupportTicket } from '@pawmeet/types';
import { isFailure, isSuccess, SUPPORT_TICKET_STATUS } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildSupportRepo } from '../test-utils/builders.js';
import { createAdminReplySupportTicket } from './admin-reply-support-ticket.js';

vi.mock('../domain/events.js', () => ({
  DOMAIN_EVENT: { SUPPORT_REPLY_SENT: 'SUPPORT_REPLY_SENT' },
  emit: vi.fn(),
}));

const buildTicket = (overrides: Partial<SupportTicket> = {}): SupportTicket => ({
  id: 'ticket-1',
  userId: 'user-1',
  guestName: null,
  guestEmail: null,
  subject: 'Bug report',
  category: 'bug',
  status: SUPPORT_TICKET_STATUS.Open,
  assignedTo: null,
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildMessage = (overrides: Partial<SupportMessage> = {}): SupportMessage => ({
  id: 'msg-1',
  ticketId: 'ticket-1',
  senderType: 'admin',
  senderId: 'admin-1',
  content: 'We are looking into it',
  isInternal: false,
  readAt: null,
  createdAt: new Date(),
  ...overrides,
});

describe('createAdminReplySupportTicket', () => {
  it('returns 404 when ticket does not exist', async () => {
    const supportRepo = buildSupportRepo({
      getTicketById: vi.fn().mockResolvedValue(null),
    });
    const execute = createAdminReplySupportTicket({ supportRepo });

    const result = await execute('admin-1', 'ticket-999', 'Reply', false);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.status).toBe(404);
  });

  it('adds admin message and transitions Open to InProgress', async () => {
    const ticket = buildTicket({ status: SUPPORT_TICKET_STATUS.Open });
    const message = buildMessage();
    const supportRepo = buildSupportRepo({
      getTicketById: vi.fn().mockResolvedValue(ticket),
      addMessage: vi.fn().mockResolvedValue(message),
      updateStatus: vi.fn().mockResolvedValue(ticket),
    });
    const execute = createAdminReplySupportTicket({ supportRepo });

    const result = await execute('admin-1', 'ticket-1', 'We are looking into it', false);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('msg-1');
    expect(supportRepo.updateStatus).toHaveBeenCalledWith(
      'ticket-1',
      SUPPORT_TICKET_STATUS.InProgress,
    );
  });

  it('does not transition status when ticket is already InProgress', async () => {
    const ticket = buildTicket({ status: SUPPORT_TICKET_STATUS.InProgress });
    const message = buildMessage();
    const supportRepo = buildSupportRepo({
      getTicketById: vi.fn().mockResolvedValue(ticket),
      addMessage: vi.fn().mockResolvedValue(message),
    });
    const execute = createAdminReplySupportTicket({ supportRepo });

    const result = await execute('admin-1', 'ticket-1', 'Update', false);

    expect(isSuccess(result)).toBe(true);
    expect(supportRepo.updateStatus).not.toHaveBeenCalled();
  });
});
