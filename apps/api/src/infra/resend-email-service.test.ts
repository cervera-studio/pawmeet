import { describe, expect, it, vi } from 'vitest';

const mockSendVerificationOtp = vi.fn().mockResolvedValue(undefined);
const mockSendPasswordResetOtp = vi.fn().mockResolvedValue(undefined);
const mockSendAccountDeletedConfirmation = vi.fn().mockResolvedValue(undefined);
const mockSendGdprExportReady = vi.fn().mockResolvedValue(undefined);
const mockSendGdprExportFailed = vi.fn().mockResolvedValue(undefined);
const mockSendAdminInvite = vi.fn().mockResolvedValue(undefined);
const mockSendSupportTicketNotification = vi.fn().mockResolvedValue(undefined);

vi.mock('../lib/email.js', () => ({
  sendVerificationOtp: (...args: unknown[]) => mockSendVerificationOtp(...args),
  sendPasswordResetOtp: (...args: unknown[]) => mockSendPasswordResetOtp(...args),
  sendAccountDeletedConfirmation: (...args: unknown[]) =>
    mockSendAccountDeletedConfirmation(...args),
  sendGdprExportReady: (...args: unknown[]) => mockSendGdprExportReady(...args),
  sendGdprExportFailed: (...args: unknown[]) => mockSendGdprExportFailed(...args),
  sendAdminInvite: (...args: unknown[]) => mockSendAdminInvite(...args),
  sendSupportTicketNotification: (...args: unknown[]) => mockSendSupportTicketNotification(...args),
}));

import { ResendEmailService } from './resend-email-service.js';

describe('ResendEmailService', () => {
  const service = new ResendEmailService();

  it('delegates sendVerificationOtp with correct params', async () => {
    await service.sendVerificationOtp('test@example.com', '123456', 'it');
    expect(mockSendVerificationOtp).toHaveBeenCalledWith('test@example.com', '123456', 'it');
  });

  it('delegates sendPasswordResetOtp with correct params', async () => {
    await service.sendPasswordResetOtp('test@example.com', '654321', 'en');
    expect(mockSendPasswordResetOtp).toHaveBeenCalledWith('test@example.com', '654321', 'en');
  });

  it('delegates sendAccountDeletedConfirmation with correct params', async () => {
    await service.sendAccountDeletedConfirmation('test@example.com', 'Mario', 'it');
    expect(mockSendAccountDeletedConfirmation).toHaveBeenCalledWith(
      'test@example.com',
      'Mario',
      'it',
    );
  });

  it('delegates sendGdprExportReady with correct params', async () => {
    await service.sendGdprExportReady(
      'test@example.com',
      'Mario',
      'https://cdn.example.com/export.zip',
      'it',
    );
    expect(mockSendGdprExportReady).toHaveBeenCalledWith(
      'test@example.com',
      'Mario',
      'https://cdn.example.com/export.zip',
      'it',
    );
  });

  it('delegates sendGdprExportFailed with correct params', async () => {
    await service.sendGdprExportFailed('test@example.com', 'Mario', 'it');
    expect(mockSendGdprExportFailed).toHaveBeenCalledWith('test@example.com', 'Mario', 'it');
  });

  it('delegates sendAdminInvite with correct params', async () => {
    await service.sendAdminInvite('admin@example.com', 'TempPass123!', 'en');
    expect(mockSendAdminInvite).toHaveBeenCalledWith('admin@example.com', 'TempPass123!', 'en');
  });

  it('delegates sendSupportTicketNotification with correct params', async () => {
    await service.sendSupportTicketNotification(
      'support@example.com',
      'ticket-abc-123',
      'Bug report',
      'Something broke...',
    );
    expect(mockSendSupportTicketNotification).toHaveBeenCalledWith(
      'support@example.com',
      'ticket-abc-123',
      'Bug report',
      'Something broke...',
    );
  });

  it('passes locale as undefined when not provided', async () => {
    await service.sendVerificationOtp('test@example.com', '000000');
    expect(mockSendVerificationOtp).toHaveBeenCalledWith('test@example.com', '000000', undefined);
  });
});
