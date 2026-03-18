import type { AdminNotificationService } from '../ports/admin-notification-service.js';
import type { EmailService } from '../ports/email-service.js';

export class EmailAdminNotificationService implements AdminNotificationService {
  private readonly emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    return this.emailService.sendPasswordResetOtp(email, code);
  }

  async sendAdminInvite(email: string, temporaryPassword: string): Promise<void> {
    return this.emailService.sendAdminInvite(email, temporaryPassword);
  }
}
