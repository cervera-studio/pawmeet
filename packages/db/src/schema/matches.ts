import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dogAId: uuid('dog_a_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    dogBId: uuid('dog_b_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    compatibilityScore: doublePrecision('compatibility_score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    check(
      'matches_compatibility_score_range',
      sql`${table.compatibilityScore} >= 0 AND ${table.compatibilityScore} <= 1`,
    ),
  ],
);

export const swipes = pgTable(
  'swipes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    swiperDogId: uuid('swiper_dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    swipedDogId: uuid('swiped_dog_id')
      .notNull()
      .references(() => dogProfiles.id, { onDelete: 'cascade' }),
    direction: varchar('direction', { length: 5 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('swipes_direction_valid', sql`${table.direction} IN ('like', 'pass')`)],
);
