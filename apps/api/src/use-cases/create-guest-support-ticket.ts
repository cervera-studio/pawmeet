import type { SupportTicket, SupportTicketCategory } from '@pawmeet/types';
import { type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { sanitizeContent } from '../lib/sanitize.js';
import type { EmailService } from '../ports/email-service.js';
import type { SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
  emailService: EmailService;
};

export function createCreateGuestSupportTicket({ supportRepo, emailService }: Deps) {
  return async (
    guestName: string,
    guestEmail: string,
    subject: string,
    category: SupportTicketCategory,
    message: string,
  ): Promise<Result<SupportTicket>> => {
    const sanitizedSubject = sanitizeContent(subject);
    const sanitizedMessage = sanitizeContent(message);
    const sanitizedName = sanitizeContent(guestName);

    const ticket = await supportRepo.createGuestTicket({
      guestName: sanitizedName,
      guestEmail,
      subject: sanitizedSubject,
      category,
    });

    await supportRepo.addMessage({
      ticketId: ticket.id,
      senderType: 'user',
      senderId: null,
      content: sanitizedMessage,
    });

    // Send notification email to support team (non-blocking)
    const preview =
      sanitizedMessage.length > 100 ? `${sanitizedMessage.slice(0, 97)}...` : sanitizedMessage;

    emailService
      .sendSupportTicketNotification('support@pawmeet.io', ticket.id, sanitizedSubject, preview)
      .catch((err) =>
        logger.error('createGuestSupportTicket', 'Failed to send support notification email', err),
      );

    logger.info('CreateGuestSupportTicket', 'Guest support ticket created', {
      ticketId: ticket.id,
      category,
    });

    return succeed(ticket);
  };
}
