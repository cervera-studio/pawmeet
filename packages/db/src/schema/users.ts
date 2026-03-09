import { pgTable, uuid, varchar, text, boolean, timestamp, doublePrecision, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  authProvider: varchar('auth_provider', { length: 10 }).notNull().default('email'),
  avatarUrl: text('avatar_url'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  locationUpdatedAt: timestamp('location_updated_at', { withTimezone: true }),
  searchRadiusKm: integer('search_radius_km').notNull().default(10),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});
