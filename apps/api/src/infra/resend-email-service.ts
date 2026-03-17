import {
  sendAccountDeletedConfirmation,
  sendGdprExportFailed,
  sendGdprExportReady,
  sendPasswordResetOtp,
  sendVerificationOtp,
} from '../lib/email.js';
import type { EmailService } from '../ports/email-service.js';

export class ResendEmailService implements EmailService {
  async sendVerificationOtp(email: string, code: string, locale?: string): Promise<void> {
    return sendVerificationOtp(email, code, locale);
  }

  async sendPasswordResetOtp(email: string, code: string, locale?: string): Promise<void> {
    return sendPasswordResetOtp(email, code, locale);
  }

  async sendAccountDeletedConfirmation(
    email: string,
    displayName: string,
    locale?: string,
  ): Promise<void> {
    return sendAccountDeletedConfirmation(email, displayName, locale);
  }

  async sendGdprExportReady(
    email: string,
    displayName: string,
    downloadUrl: string,
    locale?: string,
  ): Promise<void> {
    return sendGdprExportReady(email, displayName, downloadUrl, locale);
  }

  async sendGdprExportFailed(email: string, displayName: string, locale?: string): Promise<void> {
    return sendGdprExportFailed(email, displayName, locale);
  }
}
