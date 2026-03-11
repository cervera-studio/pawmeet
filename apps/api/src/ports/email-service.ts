export interface EmailService {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendVerificationOtp(email: string, code: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
