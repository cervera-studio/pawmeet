import { logger } from '@pawmeet/utils';
import type {
  AuditEntry,
  AuditLogRepository,
  ResourceType,
} from '../ports/audit-log-repository.js';

const RESOURCE_TYPE = {
  user: 'user',
  dog: 'dog',
  photo: 'photo',
  report: 'report',
  post: 'post',
  story: 'story',
  event: 'event',
  organization: 'organization',
  sponsor: 'sponsor',
  settings: 'settings',
  deletion: 'deletion',
  admin: 'admin',
  breed: 'breed',
  notification: 'notification',
  challenge: 'challenge',
} as const;

/**
 * Log an admin action to the audit log table.
 *
 * Fire-and-forget safe: errors are logged but never thrown,
 * so audit logging never blocks the main mutation and
 * `void logAdminAction(...)` never creates unhandled rejections.
 */
async function logAdminAction(repo: AuditLogRepository, entry: AuditEntry): Promise<void> {
  try {
    await repo.logAction(entry);
  } catch (error) {
    logger.error('AdminAudit', 'Failed to log admin action', {
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      error,
    });
  }
}

export type { AuditEntry, ResourceType };
export { logAdminAction, RESOURCE_TYPE };
