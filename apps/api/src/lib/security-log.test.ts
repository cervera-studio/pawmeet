import { describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from '@pawmeet/utils';
import { logSecurityEvent, SECURITY_EVENT } from './security-log.js';

describe('security-log', () => {
  describe('SECURITY_EVENT', () => {
    it('contains expected event types', () => {
      expect(SECURITY_EVENT.LoginSuccess).toBe('auth.login.success');
      expect(SECURITY_EVENT.LoginFailed).toBe('auth.login.failed');
      expect(SECURITY_EVENT.AccountLocked).toBe('auth.account.locked');
      expect(SECURITY_EVENT.MfaEnabled).toBe('auth.mfa.enabled');
      expect(SECURITY_EVENT.ImpersonationStarted).toBe('admin.impersonation.started');
    });
  });

  describe('logSecurityEvent', () => {
    it('logs a security event via structured logger', () => {
      logSecurityEvent({
        event: SECURITY_EVENT.LoginSuccess,
        userId: 'user-123',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'SecurityAudit',
        'auth.login.success',
        expect.objectContaining({ userId: 'user-123' }),
      );
    });

    it('pseudonymizes email to a hex hash', () => {
      logSecurityEvent({
        event: SECURITY_EVENT.LoginFailed,
        email: 'test@example.com',
      });

      const call = vi.mocked(logger.info).mock.calls.at(-1);
      const metadata = call?.[2] as Record<string, unknown>;

      expect(metadata.emailHash).toBeDefined();
      expect(typeof metadata.emailHash).toBe('string');
      expect(metadata.emailHash).toHaveLength(16);
      // Must NOT contain the original email
      expect(metadata.emailHash).not.toContain('test@example.com');
    });

    it('omits emailHash when email is not provided', () => {
      logSecurityEvent({
        event: SECURITY_EVENT.Logout,
        userId: 'user-123',
      });

      const call = vi.mocked(logger.info).mock.calls.at(-1);
      const metadata = call?.[2] as Record<string, unknown>;
      expect(metadata.emailHash).toBeUndefined();
    });

    it('includes metadata and ip/userAgent when provided', () => {
      logSecurityEvent({
        event: SECURITY_EVENT.RateLimited,
        ip: '1.2.3.4',
        userAgent: 'PawMeet/1.0',
        metadata: { reason: 'too_many_attempts' },
      });

      const call = vi.mocked(logger.info).mock.calls.at(-1);
      const metadata = call?.[2] as Record<string, unknown>;
      expect(metadata.ip).toBe('1.2.3.4');
      expect(metadata.userAgent).toBe('PawMeet/1.0');
      expect(metadata.reason).toBe('too_many_attempts');
    });
  });
});
