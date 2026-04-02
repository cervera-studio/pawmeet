import { adminAuditLog, adminUsers } from '@pawmeet/db';
import { and, count, desc, eq, gte, ilike, type SQL, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminAuditLogRepository,
  AuditLogEntry,
  AuditLogFilters,
  PaginatedResult,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminAuditLogRepository implements AdminAuditLogRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listAuditLog(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>> {
    const { page, pageSize, adminId, resourceType, action, from, to, search } = filters;
    const offset = (page - 1) * pageSize;

    const conditions: (SQL | undefined)[] = [];
    if (adminId) conditions.push(eq(adminAuditLog.adminId, adminId));
    if (resourceType) conditions.push(eq(adminAuditLog.resourceType, resourceType));
    if (action) conditions.push(ilike(adminAuditLog.action, `%${action}%`));
    if (from) conditions.push(gte(adminAuditLog.createdAt, new Date(from)));
    if (to) conditions.push(sql`${adminAuditLog.createdAt} <= ${new Date(to)}`);
    if (search) conditions.push(ilike(adminAuditLog.action, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: adminAuditLog.id,
          adminId: adminAuditLog.adminId,
          adminName: adminUsers.displayName,
          adminEmail: adminUsers.email,
          action: adminAuditLog.action,
          resourceType: adminAuditLog.resourceType,
          resourceId: adminAuditLog.resourceId,
          changes: adminAuditLog.changes,
          reason: adminAuditLog.reason,
          ipAddress: adminAuditLog.ipAddress,
          createdAt: adminAuditLog.createdAt,
        })
        .from(adminAuditLog)
        .leftJoin(adminUsers, eq(adminAuditLog.adminId, adminUsers.id))
        .where(whereClause)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(adminAuditLog).where(whereClause),
    ]);

    return {
      data: items as AuditLogEntry[],
      total: totalRow?.value ?? 0,
    };
  }
}
