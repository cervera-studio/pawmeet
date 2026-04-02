import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailService } from '../ports/email-service.js';
import { EmailAdminNotificationService } from './email-admin-notification-service.js';

describe('EmailAdminNotificationService', () => {
  const mockEmailService = {
    sendVerificationOtp: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined),
    sendAccountDeletedConfirmation: vi.fn().mockResolvedValue(undefined),
    sendGdprExportReady: vi.fn().mockResolvedValue(undefined),
    sendGdprExportFailed: vi.fn().mockResolvedValue(undefined),
    sendAdminInvite: vi.fn().mockResolvedValue(undefined),
    sendSupportTicketNotification: vi.fn().mockResolvedValue(undefined),
  } satisfies EmailService;

  let service: EmailAdminNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailAdminNotificationService(mockEmailService);
  });

  it('delegates sendPasswordResetOtp to the email service', async () => {
    await service.sendPasswordResetOtp('admin@example.com', '123456');

    expect(mockEmailService.sendPasswordResetOtp).toHaveBeenCalledWith(
      'admin@example.com',
      '123456',
    );
  });

  it('delegates sendAdminInvite to the email service', async () => {
    await service.sendAdminInvite('new-admin@example.com', 'temp-pass-42');

    expect(mockEmailService.sendAdminInvite).toHaveBeenCalledWith(
      'new-admin@example.com',
      'temp-pass-42',
    );
  });
});
