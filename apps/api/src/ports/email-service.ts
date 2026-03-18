export interface EmailService {
  sendVerificationOtp(email: string, code: string, locale?: string): Promise<void>;
  sendPasswordResetOtp(email: string, code: string, locale?: string): Promise<void>;
  sendAccountDeletedConfirmation(
    email: string,
    displayName: string,
    locale?: string,
  ): Promise<void>;
  sendGdprExportReady(
    email: string,
    displayName: string,
    downloadUrl: string,
    locale?: string,
  ): Promise<void>;
  sendGdprExportFailed(email: string, displayName: string, locale?: string): Promise<void>;
  sendAdminInvite(email: string, temporaryPassword: string, locale?: string): Promise<void>;
}
