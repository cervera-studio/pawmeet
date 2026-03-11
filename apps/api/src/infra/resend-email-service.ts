import { sendPasswordResetOtp, sendVerificationOtp } from '../lib/email.js';
import type { EmailService } from '../ports/email-service.js';

export class ResendEmailService implements EmailService {
  async sendVerificationOtp(email: string, code: string): Promise<void> {
    return sendVerificationOtp(email, code);
  }

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    return sendPasswordResetOtp(email, code);
  }
}
