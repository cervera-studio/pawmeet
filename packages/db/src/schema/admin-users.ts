import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('viewer'),
    isActive: boolean('is_active').notNull().default(true),
    refreshTokenHash: varchar('refresh_token_hash', { length: 64 }),
    /** Encrypted TOTP secret (base32). NULL = MFA not configured */
    totpSecret: varchar('totp_secret', { length: 512 }),
    /** Whether MFA is fully enabled (setup complete + verified) */
    totpEnabled: boolean('totp_enabled').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'admin_users_role_valid',
      sql`${table.role} IN ('viewer', 'moderator', 'admin', 'super_admin')`,
    ),
  ],
);
