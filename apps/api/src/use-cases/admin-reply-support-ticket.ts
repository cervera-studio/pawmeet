import type { SupportMessage } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { sanitizeContent } from '../lib/sanitize.js';
import type { NotificationService } from '../ports/notification-service.js';
import type { SupportRepository } from '../ports/support-repository.js';

type Deps = {
  supportRepo: SupportRepository;
  notificationService: NotificationService;
};

export function createAdminReplySupportTicket({ supportRepo, notificationService }: Deps) {
  return async (
    adminId: string,
    ticketId: string,
    content: string,
    isInternal: boolean,
  ): Promise<Result<SupportMessage>> => {
    const ticket = await supportRepo.getTicketById(ticketId);
    if (!ticket) {
      return fail(new AppError('TICKET_NOT_FOUND', 'Ticket di supporto non trovato', 404));
    }

    const sanitizedContent = sanitizeContent(content);

    const message = await supportRepo.addMessage({
      ticketId,
      senderType: 'admin',
      senderId: adminId,
      content: sanitizedContent,
      isInternal,
    });

    // Set status to in_progress if currently open
    if (ticket.status === 'open') {
      await supportRepo.updateStatus(ticketId, 'in_progress');
    }

    // Send push notification to user if not an internal note
    if (!isInternal && ticket.userId) {
      const preview =
        sanitizedContent.length > 50 ? `${sanitizedContent.slice(0, 47)}...` : sanitizedContent;

      notificationService
        .send({
          userId: ticket.userId,
          title: 'Supporto PawMeet',
          body: preview,
          data: { ticketId, type: 'support_reply' },
        })
        .catch((err) =>
          logger.error('adminReplySupportTicket', 'Failed to send push notification', err),
        );
    }

    logger.info('AdminReplySupportTicket', 'Admin replied to support ticket', {
      adminId,
      ticketId,
      isInternal,
    });

    return succeed(message);
  };
}
