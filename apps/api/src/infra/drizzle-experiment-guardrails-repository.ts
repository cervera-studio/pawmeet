import { analyticsEvents } from '@pawmeet/db';
import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  ExperimentGuardrailsRepository,
  VariantFeedRow,
  VariantRetentionRow,
  VariantUnmatchRow,
} from '../ports/experiment-guardrails-repository.js';

export class DrizzleExperimentGuardrailsRepository implements ExperimentGuardrailsRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async getVariantUnmatchRates(baseFilter: {
    dayStart: Date;
    nextDayStart: Date;
  }): Promise<VariantUnmatchRow[]> {
    const { dayStart, nextDayStart } = baseFilter;
    const lookbackFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;
    const variantFilter = sql`${analyticsEvents.properties}->>'experiment_variant' IS NOT NULL`;
    const baseCondition = sql`${lookbackFilter} AND ${variantFilter}`;

    const unmatchRows = await this.db.execute<VariantUnmatchRow>(sql`
      SELECT
        ${analyticsEvents.properties}->>'experiment_variant' AS variant,
        COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'match_unmatched') AS unmatches,
        COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'match_created') AS creates
      FROM ${analyticsEvents}
      WHERE ${baseCondition}
        AND ${analyticsEvents.eventName} IN ('match_unmatched', 'match_created')
      GROUP BY ${analyticsEvents.properties}->>'experiment_variant'
    `);

    return unmatchRows.rows;
  }

  async getVariantFeedEmptyRates(baseFilter: {
    dayStart: Date;
    nextDayStart: Date;
  }): Promise<VariantFeedRow[]> {
    const { dayStart, nextDayStart } = baseFilter;
    const lookbackFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;
    const variantFilter = sql`${analyticsEvents.properties}->>'experiment_variant' IS NOT NULL`;
    const baseCondition = sql`${lookbackFilter} AND ${variantFilter}`;

    const feedRows = await this.db.execute<VariantFeedRow>(sql`
      SELECT
        ${analyticsEvents.properties}->>'experiment_variant' AS variant,
        COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'match_feed_exhausted') AS exhausted,
        COUNT(*) FILTER (WHERE ${analyticsEvents.eventName} = 'match_feed_loaded') AS loaded
      FROM ${analyticsEvents}
      WHERE ${baseCondition}
        AND ${analyticsEvents.eventName} IN ('match_feed_exhausted', 'match_feed_loaded')
      GROUP BY ${analyticsEvents.properties}->>'experiment_variant'
    `);

    return feedRows.rows;
  }

  async getVariantRetentionRates(baseFilter: {
    dayStart: Date;
    nextDayStart: Date;
  }): Promise<VariantRetentionRow[]> {
    const { dayStart, nextDayStart } = baseFilter;
    const lookbackFilter = sql`${analyticsEvents.serverTimestamp} >= ${dayStart} AND ${analyticsEvents.serverTimestamp} < ${nextDayStart}`;
    const variantFilter = sql`${analyticsEvents.properties}->>'experiment_variant' IS NOT NULL`;
    const baseCondition = sql`${lookbackFilter} AND ${variantFilter}`;

    const retentionRows = await this.db.execute<VariantRetentionRow>(sql`
      SELECT
        ${analyticsEvents.properties}->>'experiment_variant' AS variant,
        COUNT(DISTINCT ${analyticsEvents.userId}) FILTER (WHERE ${analyticsEvents.eventName} = 'app_opened') AS active_users,
        COUNT(DISTINCT ${analyticsEvents.userId}) AS enrolled_users
      FROM ${analyticsEvents}
      WHERE ${baseCondition}
      GROUP BY ${analyticsEvents.properties}->>'experiment_variant'
    `);

    return retentionRows.rows;
  }
}
