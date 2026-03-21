import { index, integer, pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Pre-aggregated daily analytics metrics.
 * Populated by BullMQ cron job (runs daily at 02:00 UTC).
 * Used by admin dashboard KPI queries for fast reads.
 */
export const analyticsDailyMetrics = pgTable(
  'analytics_daily_metrics',
  {
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    metricName: varchar('metric_name', { length: 100 }).notNull(),
    value: integer('value').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.date, t.metricName] }),
    index('analytics_daily_metric_name_idx').on(t.metricName),
  ],
);
