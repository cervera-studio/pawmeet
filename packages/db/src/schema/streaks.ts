import { date, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// -- Streaks ------------------------------------------------------------------

export const streaks = pgTable(
  'streaks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    currentLength: integer('current_length').notNull().default(0),
    longestLength: integer('longest_length').notNull().default(0),
    lastActivityDate: date('last_activity_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('streaks_user_id_type_unique').on(t.userId, t.type),
    index('streaks_user_idx').on(t.userId),
  ],
);
