import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const CONSENT_TYPE = {
  Analytics: 'analytics',
  AbTesting: 'ab_testing',
  ErrorTracking: 'error_tracking',
  Marketing: 'marketing',
} as const;

export type ConsentType = (typeof CONSENT_TYPE)[keyof typeof CONSENT_TYPE];

export const CONSENT_SOURCE = {
  MobileOnboarding: 'mobile_onboarding',
  MobileSettings: 'mobile_settings',
  WebBanner: 'web_banner',
} as const;

export type ConsentSource = (typeof CONSENT_SOURCE)[keyof typeof CONSENT_SOURCE];

export const userConsents = pgTable(
  'user_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentType: varchar('consent_type', { length: 30 }).notNull(),
    consentVersion: varchar('consent_version', { length: 10 }).notNull().default('v1.0'),
    granted: boolean('granted').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    source: varchar('source', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('user_consents_user_type_uniq').on(t.userId, t.consentType),
    check(
      'user_consents_type_valid',
      sql`${t.consentType} IN ('analytics', 'ab_testing', 'error_tracking', 'marketing')`,
    ),
    check(
      'user_consents_source_valid',
      sql`${t.source} IN ('mobile_onboarding', 'mobile_settings', 'web_banner')`,
    ),
  ],
);
