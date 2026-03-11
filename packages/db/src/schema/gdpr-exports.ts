import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const gdprExports = pgTable(
  'gdpr_exports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    r2Key: text('r2_key'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('gdpr_exports_user_idx').on(table.userId),
    index('gdpr_exports_status_idx').on(table.status),
    check(
      'gdpr_exports_status_valid',
      sql`${table.status} IN ('pending', 'processing', 'completed', 'failed')`,
    ),
  ],
);
