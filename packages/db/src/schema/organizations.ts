import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { adminUsers } from './admin-users';
import { users } from './users';

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    type: varchar('type', { length: 30 }).notNull(),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    websiteUrl: varchar('website_url', { length: 500 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    isVerified: boolean('is_verified').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'organizations_type_valid',
      sql`${table.type} IN ('pawmeet_team', 'association', 'educator', 'brand')`,
    ),
  ],
);

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('org_members_pair_idx').on(table.organizationId, table.userId),
    check(
      'organization_members_role_valid',
      sql`${table.role} IN ('owner', 'admin', 'member')`,
    ),
  ],
);
