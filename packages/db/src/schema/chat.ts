import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { matches } from './matches';
import { users } from './users';

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  status: varchar('status', { length: 10 }).notNull().default('sent'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
