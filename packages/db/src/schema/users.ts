import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
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
      .$type<{ matches: boolean; messages: boolean; reminders: boolean }>()
      .default({
        matches: true,
        messages: true,
        reminders: true,
      }),
    pushToken: text('push_token'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [
    index('users_location_idx').on(table.latitude, table.longitude),
    check('users_latitude_range', sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check(
      'users_longitude_range',
      sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
    ),
    check(
      'users_search_radius_range',
      sql`${table.searchRadiusKm} >= 1 AND ${table.searchRadiusKm} <= 50`,
    ),
    check(
      'users_auth_provider_valid',
      sql`${table.authProvider} IN ('email', 'apple', 'google')`,
    ),
  ],
);
