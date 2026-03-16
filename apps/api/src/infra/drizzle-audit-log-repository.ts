import { adminAuditLog } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { AuditEntry, AuditLogRepository } from '../ports/audit-log-repository.js';

export class DrizzleAuditLogRepository implements AuditLogRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async logAction(entry: AuditEntry): Promise<void> {
    try {
      await this.db.insert(adminAuditLog).values({
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
}
