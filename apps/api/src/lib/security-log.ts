import { logger } from '@dogwalk/utils';

const SECURITY_EVENT = {
  LoginSuccess: 'auth.login.success',
  LoginFailed: 'auth.login.failed',
  RegisterSuccess: 'auth.register.success',
  PasswordResetRequested: 'auth.password_reset.requested',
  PasswordResetSuccess: 'auth.password_reset.success',
  PasswordResetFailed: 'auth.password_reset.failed',
  TokenRefreshed: 'auth.token.refreshed',
  TokenRefreshFailed: 'auth.token.refresh_failed',
  Logout: 'auth.logout',
  SocialLoginSuccess: 'auth.social_login.success',
  SocialLoginFailed: 'auth.social_login.failed',
  AccountLocked: 'auth.account.locked',
  RateLimited: 'auth.rate_limited',
  AgeVerificationFailed: 'auth.age_verification.failed',
} as const;

type SecurityEvent = (typeof SECURITY_EVENT)[keyof typeof SECURITY_EVENT];

interface SecurityLogEntry {
  event: SecurityEvent;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a security-relevant event for audit trail.
 *
 * Currently logs to structured stdout (picked up by Sentry/log aggregator).
 * Can be extended to write to an `audit_log` DB table in the future.
 */
function logSecurityEvent(entry: SecurityLogEntry): void {
  logger.info('SecurityAudit', entry.event, {
    userId: entry.userId,
    email: entry.email,
    ip: entry.ip,
    userAgent: entry.userAgent,
    ...entry.metadata,
  });
}

export { logSecurityEvent, SECURITY_EVENT };
