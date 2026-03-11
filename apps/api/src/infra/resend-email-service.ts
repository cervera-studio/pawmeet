import {
  sendAccountDeletedConfirmation,
  sendGdprExportFailed,
  sendGdprExportReady,
  sendPasswordResetOtp,
  sendVerificationOtp,
} from '../lib/email.js';
import type { EmailService } from '../ports/email-service.js';

export class ResendEmailService implements EmailService {
  async sendVerificationOtp(email: string, code: string): Promise<void> {
    return sendVerificationOtp(email, code);
  }

  async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    return sendPasswordResetOtp(email, code);
  }

  async sendAccountDeletedConfirmation(email: string, displayName: string): Promise<void> {
    return sendAccountDeletedConfirmation(email, displayName);
  }

  async sendGdprExportReady(
    email: string,
    displayName: string,
    downloadUrl: string,
  ): Promise<void> {
    return sendGdprExportReady(email, displayName, downloadUrl);
  }

  async sendGdprExportFailed(email: string, displayName: string): Promise<void> {
    return sendGdprExportFailed(email, displayName);
  }
}
