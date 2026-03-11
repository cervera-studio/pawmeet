import {
  sendPasswordResetEmail,
  sendPasswordResetOtp,
  sendVerificationEmail,
  sendVerificationOtp,
} from '../lib/email.js';
import type { EmailService } from '../ports/email-service.js';

export class ResendEmailService implements EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    return sendVerificationEmail(email, token);
  }

  async sendVerificationOtp(email: string, code: string): Promise<void> {
    return sendVerificationOtp(email, code);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    return sendPasswordResetEmail(email, token);
  }

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    return sendPasswordResetOtp(email, code);
  }
}
