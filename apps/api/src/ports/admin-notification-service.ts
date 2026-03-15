export interface AdminNotificationService {
  sendPasswordResetOtp(email: string, code: string): Promise<void>;
  sendAdminInvite(email: string, temporaryPassword: string): Promise<void>;
}
