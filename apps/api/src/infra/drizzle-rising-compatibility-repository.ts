import { users } from '@pawmeet/db';
import { and, eq, gt, isNotNull } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { RisingCompatibilityRepository } from '../ports/rising-compatibility-repository.js';

export class DrizzleRisingCompatibilityRepository implements RisingCompatibilityRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async getActiveUsersWithLocationBatch(
    activeThreshold: Date,
    limit: number,
    offset: number,
  ): Promise<{ id: string }[]> {
    const activeUsers = await this.db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          isNotNull(users.latitude),
          isNotNull(users.longitude),
          gt(users.lastLoginAt, activeThreshold),
        ),
      )
      .limit(limit)
      .offset(offset);

    return activeUsers;
  }
}
