import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';
import { users } from './users';
import { walks } from './walks';

export const walkFeedback = pgTable(
  'walk_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walkId: uuid('walk_id')
      .notNull()
      .references(() => walks.id, { onDelete: 'cascade' }),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toDogId: uuid('to_dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('walk_feedback_walk_user_unique').on(table.walkId, table.fromUserId),
    index('walk_feedback_from_user_idx').on(table.fromUserId),
    index('walk_feedback_to_dog_idx').on(table.toDogId),
    check('walk_feedback_rating_range', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  ],
);
