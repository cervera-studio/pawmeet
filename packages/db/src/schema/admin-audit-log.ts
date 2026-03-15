import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin-users';

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => adminUsers.id),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: varchar('resource_id', { length: 100 }),
    changes: jsonb('changes').$type<{ before?: Record<string, unknown>; after?: Record<string, unknown> }>(),
    reason: text('reason'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_admin').on(table.adminId),
    index('idx_audit_resource').on(table.resourceType, table.resourceId),
    index('idx_audit_date').on(table.createdAt),
    index('idx_audit_action').on(table.action),
  ],
);
