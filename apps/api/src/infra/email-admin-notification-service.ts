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

  async sendAdminInvite(_email: string, _temporaryPassword: string): Promise<void> {
    // TODO: implement admin invite email template
    // For now this is a no-op — admin users are created with a temporary password
    // communicated out-of-band. When an invite template is added to lib/email.ts,
    // wire it here.
  }
}
