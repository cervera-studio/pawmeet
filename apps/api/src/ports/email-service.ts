export interface EmailService {
  sendVerificationOtp(email: string, code: string): Promise<void>;
  sendPasswordResetOtp(email: string, code: string): Promise<void>;
  sendAccountDeletedConfirmation(email: string, displayName: string): Promise<void>;
}
