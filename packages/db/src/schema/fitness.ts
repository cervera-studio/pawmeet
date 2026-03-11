import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
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
    check('walk_tracks_distance_non_negative', sql`${table.distanceKm} >= 0`),
    check('walk_tracks_duration_non_negative', sql`${table.durationMinutes} >= 0`),
    check('walk_tracks_avg_speed_non_negative', sql`${table.avgSpeedKmh} >= 0`),
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
  (table) => [
    index('walk_track_points_track_idx').on(table.trackId),
    check(
      'walk_track_points_latitude_range',
      sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`,
    ),
    check(
      'walk_track_points_longitude_range',
      sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
    ),
    check('walk_track_points_position_non_negative', sql`${table.position} >= 0`),
    check(
      'walk_track_points_speed_non_negative',
      sql`${table.speedKmh} IS NULL OR ${table.speedKmh} >= 0`,
    ),
  ],
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
    check('daily_activity_steps_non_negative', sql`${table.stepsCount} >= 0`),
    check('daily_activity_distance_non_negative', sql`${table.walkDistanceKm} >= 0`),
    check('daily_activity_duration_non_negative', sql`${table.walkDurationMin} >= 0`),
    check('daily_activity_walk_count_non_negative', sql`${table.walkCount} >= 0`),
  ],
);
