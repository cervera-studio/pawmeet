import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { groupEvents } from './group-events';
import { users } from './users';

export const groupMessages = pgTable(
  'group_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => groupEvents.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    mediaUrl: text('media_url'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('group_messages_event_idx').on(table.eventId),
    index('group_messages_sender_idx').on(table.senderId),
  ],
);

export const groupMessageReads = pgTable(
  'group_message_reads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => groupEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('group_message_reads_event_idx').on(table.eventId),
    index('group_message_reads_user_idx').on(table.userId),
  ],
);
