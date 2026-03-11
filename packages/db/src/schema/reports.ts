import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedUserId: uuid('reported_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(), // inappropriate, fake, harassment, spam, other
    description: text('description'),
    status: text('status').notNull().default('pending'), // pending, resolved, dismissed
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAction: text('resolved_action'), // dismiss, warn, suspend, ban
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('reports_reporter_idx').on(table.reporterId),
    index('reports_reported_user_idx').on(table.reportedUserId),
    check(
      'reports_reason_valid',
      sql`${table.reason} IN ('inappropriate', 'fake', 'harassment', 'spam', 'other')`,
    ),
    check(
      'reports_status_valid',
      sql`${table.status} IN ('pending', 'resolved', 'dismissed')`,
    ),
    check(
      'reports_resolved_action_valid',
      sql`${table.resolvedAction} IS NULL OR ${table.resolvedAction} IN ('dismiss', 'warn', 'suspend', 'ban')`,
    ),
  ],
);
