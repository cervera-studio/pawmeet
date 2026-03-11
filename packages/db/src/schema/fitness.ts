import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { walks } from './walks';

export const walkTracks = pgTable(
  'walk_tracks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    walkId: uuid('walk_id').references(() => walks.id, { onDelete: 'set null' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    distanceKm: doublePrecision('distance_km').notNull().default(0),
    durationMinutes: integer('duration_minutes').notNull().default(0),
    avgSpeedKmh: doublePrecision('avg_speed_kmh').notNull().default(0),
    isCompleted: boolean('is_completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('walk_tracks_walk_idx').on(table.walkId),
    index('walk_tracks_user_idx').on(table.userId),
  ],
);

export const walkTrackPoints = pgTable(
  'walk_track_points',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    trackId: uuid('track_id')
      .notNull()
      .references(() => walkTracks.id, { onDelete: 'cascade' }),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    altitude: doublePrecision('altitude'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    speedKmh: doublePrecision('speed_kmh'),
    position: integer('position').notNull(),
  },
  (table) => [index('walk_track_points_track_idx').on(table.trackId)],
);

export const dailyActivity = pgTable(
  'daily_activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    stepsCount: integer('steps_count').notNull().default(0),
    walkDistanceKm: doublePrecision('walk_distance_km').notNull().default(0),
    walkDurationMin: integer('walk_duration_min').notNull().default(0),
    walkCount: integer('walk_count').notNull().default(0),
    source: text('source').notNull().default('app'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('daily_activity_user_date_source_idx').on(table.userId, table.date, table.source),
  ],
);
