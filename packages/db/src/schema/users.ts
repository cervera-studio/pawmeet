import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    displayName: varchar('display_name', { length: 50 }).notNull(),
    authProvider: varchar('auth_provider', { length: 10 }).notNull().default('email'),
    passwordHash: text('password_hash'),
    avatarUrl: text('avatar_url'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    locationUpdatedAt: timestamp('location_updated_at', { withTimezone: true }),
    searchRadiusKm: integer('search_radius_km').notNull().default(10),
    emailVerified: boolean('email_verified').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    notificationPrefs: jsonb('notification_prefs')
      .$type<{
        matches: boolean;
        messages: boolean;
        reminders: boolean;
        feed: boolean;
        nearby: boolean;
        quietHoursStart?: string | null; // "22:00" format
        quietHoursEnd?: string | null; // "07:00" format
        timezone?: string | null; // "Europe/Rome" format
      }>()
      .default({
        matches: true,
        messages: true,
        reminders: true,
        feed: true,
        nearby: true,
      }),
    dateOfBirth: date('date_of_birth', { mode: 'date' }),
    pushToken: text('push_token'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    deletionScheduledAt: timestamp('deletion_scheduled_at', { withTimezone: true }),
    followersCount: integer('followers_count').notNull().default(0),
    followingCount: integer('following_count').notNull().default(0),
  },
  (table) => [
    // GiST spatial index managed via SQL migration (0005_add_postgis.sql)
    // index('users_location_gist_idx') — ST_Point(longitude, latitude)::geography
    check('users_latitude_range', sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check('users_longitude_range', sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
    check(
      'users_search_radius_range',
      sql`${table.searchRadiusKm} >= 1 AND ${table.searchRadiusKm} <= 50`,
    ),
    check('users_auth_provider_valid', sql`${table.authProvider} IN ('email', 'apple', 'google')`),
    check(
      'users_dob_in_past',
      sql`${table.dateOfBirth} IS NULL OR ${table.dateOfBirth} <= CURRENT_DATE`,
    ),
    check('users_followers_count_non_negative', sql`${table.followersCount} >= 0`),
    check('users_following_count_non_negative', sql`${table.followingCount} >= 0`),
  ],
);
