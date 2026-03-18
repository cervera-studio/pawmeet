import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';
import { walkTracks } from './fitness';
import { users } from './users';

export const dogMoodLogs = pgTable(
  'dog_mood_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dogId: uuid('dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    trackId: uuid('track_id')
      .notNull()
      .references(() => walkTracks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    tags: text('tags').array().notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('dog_mood_log_dog_track_unique').on(table.dogId, table.trackId),
    index('dog_mood_log_dog_idx').on(table.dogId),
    index('dog_mood_log_user_idx').on(table.userId),
    check('mood_log_rating_range', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
  ],
);
