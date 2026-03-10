import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/email.js';
import type { EmailService } from '../ports/email-service.js';

export class ResendEmailService implements EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    return sendVerificationEmail(email, token);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    return sendPasswordResetEmail(email, token);
  }
}
