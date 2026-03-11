import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { matches } from './matches';
import { users } from './users';

export const walks = pgTable(
  'walks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMin: integer('duration_min').notNull().default(30),
    location: text('location'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    status: text('status').notNull().default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'walks_duration_range',
      sql`${table.durationMin} >= 15 AND ${table.durationMin} <= 180`,
    ),
    check('walks_latitude_range', sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check(
      'walks_longitude_range',
      sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
    ),
    check(
      'walks_status_valid',
      sql`${table.status} IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')`,
    ),
  ],
);
