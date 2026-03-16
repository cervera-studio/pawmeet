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
 * Fire-and-forget: errors are logged but never thrown,
 * so audit logging never blocks the main mutation.
 */
async function logAdminAction(repo: AuditLogRepository, entry: AuditEntry): Promise<void> {
  await repo.logAction(entry);
}

export type { AuditEntry, ResourceType };
export { logAdminAction, RESOURCE_TYPE };
