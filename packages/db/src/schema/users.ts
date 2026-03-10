import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
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
  pushToken: text('push_token'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});
