import type { SupportTicket, SupportTicketCategory } from '@pawmeet/types';
import { type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { sanitizeContent } from '../lib/sanitize.js';
import type { EmailService } from '../ports/email-service.js';
import type { SupportRepository } from '../ports/support-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

type Deps = {
  supportRepo: SupportRepository;
  emailService: EmailService;
  userRepo: UserRepository;
};

export function createCreateSupportTicket({ supportRepo, emailService, userRepo }: Deps) {
  return async (
    userId: string,
    subject: string,
    category: SupportTicketCategory,
    message: string,
  ): Promise<Result<SupportTicket>> => {
    const sanitizedSubject = sanitizeContent(subject);
    const sanitizedMessage = sanitizeContent(message);

    const ticket = await supportRepo.createTicket({
      userId,
      subject: sanitizedSubject,
      category,
    });

    await supportRepo.addMessage({
      ticketId: ticket.id,
      senderType: 'user',
      senderId: userId,
      content: sanitizedMessage,
    });

    // Send notification email to support team (non-blocking)
    const _user = await userRepo.findById(userId);
    const preview =
      sanitizedMessage.length > 100 ? `${sanitizedMessage.slice(0, 97)}...` : sanitizedMessage;

    emailService
      .sendSupportTicketNotification('support@pawmeet.io', ticket.id, sanitizedSubject, preview)
      .catch((err) =>
        logger.error('createSupportTicket', 'Failed to send support notification email', err),
      );

    logger.info('CreateSupportTicket', 'Support ticket created', {
      userId,
      ticketId: ticket.id,
      category,
    });

    return succeed(ticket);
  };
}
