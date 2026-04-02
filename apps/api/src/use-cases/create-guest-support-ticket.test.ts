import type { SupportTicket } from '@pawmeet/types';
import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildEmailService } from '../test-utils/builders.js';
import type { SupportRepository } from '../ports/support-repository.js';
import { createCreateGuestSupportTicket } from './create-guest-support-ticket.js';

const buildSupportRepo = (overrides: Partial<SupportRepository> = {}): SupportRepository =>
  ({
    createGuestTicket: vi.fn(),
    addMessage: vi.fn(),
    ...overrides,
  }) as unknown as SupportRepository;

const buildTicket = (overrides: Partial<SupportTicket> = {}): SupportTicket => ({
  id: 'ticket-1',
  userId: null,
  guestName: 'Mario',
  guestEmail: 'mario@example.com',
  subject: 'Help me',
  category: 'general',
  status: 'open',
  assignedTo: null,
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('createCreateGuestSupportTicket', () => {
  it('creates a guest ticket, adds message, and sends email notification', async () => {
    const ticket = buildTicket();
    const supportRepo = buildSupportRepo({
      createGuestTicket: vi.fn().mockResolvedValue(ticket),
      addMessage: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    });
    const emailService = buildEmailService({
      sendSupportTicketNotification: vi.fn().mockResolvedValue(undefined),
    });

    const execute = createCreateGuestSupportTicket({ supportRepo, emailService });
    const result = await execute('Mario', 'mario@example.com', 'Help me', 'general', 'I need help');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('ticket-1');
    expect(supportRepo.createGuestTicket).toHaveBeenCalledOnce();
    expect(supportRepo.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 'ticket-1', senderType: 'user' }),
    );
    expect(emailService.sendSupportTicketNotification).toHaveBeenCalledOnce();
  });
});
