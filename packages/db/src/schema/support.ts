import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './admin-users';
import { users } from './users';

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    guestName: varchar('guest_name', { length: 200 }),
    guestEmail: varchar('guest_email', { length: 255 }),
    subject: varchar('subject', { length: 300 }).notNull(),
    category: varchar('category', { length: 20 }).notNull().default('general'),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    assignedTo: uuid('assigned_to').references(() => adminUsers.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_support_tickets_user_id').on(table.userId),
    index('idx_support_tickets_status').on(table.status),
    index('idx_support_tickets_assigned_to').on(table.assignedTo),
    index('idx_support_tickets_created_at').on(table.createdAt),
    check(
      'support_tickets_status_valid',
      sql`${table.status} IN ('open', 'in_progress', 'resolved', 'closed')`,
    ),
    check(
      'support_tickets_category_valid',
      sql`${table.category} IN ('general', 'bug', 'account', 'safety', 'billing', 'other')`,
    ),
  ],
);

export const supportMessages = pgTable(
  'support_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => supportTickets.id, { onDelete: 'cascade' }),
    senderType: varchar('sender_type', { length: 10 }).notNull(),
    senderId: uuid('sender_id'),
    content: text('content').notNull(),
    isInternal: boolean('is_internal').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_support_messages_ticket_id').on(table.ticketId),
    index('idx_support_messages_ticket_created').on(table.ticketId, table.createdAt),
    check(
      'support_messages_sender_type_valid',
      sql`${table.senderType} IN ('user', 'admin', 'system')`,
    ),
  ],
);
