import { adminAuditLog } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

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
} as const;

type ResourceType = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

interface AuditEntry {
  adminId: string;
  action: string;
  resourceType: ResourceType;
  resourceId?: string;
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an admin action to the audit log table.
 *
 * Fire-and-forget: errors are logged but never thrown,
 * so audit logging never blocks the main mutation.
 */
async function logAdminAction(db: NeonHttpDatabase, entry: AuditEntry): Promise<void> {
  try {
    await db.insert(adminAuditLog).values({
      adminId: entry.adminId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      changes: entry.changes,
      reason: entry.reason,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });
  } catch (error) {
    logger.error('AdminAudit', 'Failed to write audit log', {
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export { logAdminAction, RESOURCE_TYPE };
export type { AuditEntry, ResourceType };
