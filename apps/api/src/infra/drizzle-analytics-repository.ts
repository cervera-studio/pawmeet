import { analyticsEvents } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { AnalyticsRepository } from '../ports/analytics-repository.js';

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async anonymizeUserEvents(userId: string): Promise<void> {
    await this.db
      .update(analyticsEvents)
      .set({ userId: null })
      .where(eq(analyticsEvents.userId, userId));
    logger.info('DrizzleAnalyticsRepository', `Anonymized analytics events for user ${userId}`);
  }
}
