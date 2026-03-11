import { badges } from '@dogwalk/db';
import type { Badge, BadgeType } from '@dogwalk/types';
import { and, eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { BadgeRepository } from '../ports/badge-repository.js';
import { firstRow, rowsAs } from './drizzle-helpers.js';

export class DrizzleBadgeRepository implements BadgeRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findByDog(dogId: string): Promise<Badge[]> {
    const rows = await this.db.select().from(badges).where(eq(badges.dogId, dogId));
    return rowsAs<Badge>(rows);
  }

  async award(dogId: string, type: BadgeType): Promise<Badge> {
    const rows = await this.db.insert(badges).values({ dogId, type }).returning();
    return firstRow<Badge>(rows);
  }

  async hasBadge(dogId: string, type: BadgeType): Promise<boolean> {
    const rows = await this.db
      .select({ id: badges.id })
      .from(badges)
      .where(and(eq(badges.dogId, dogId), eq(badges.type, type)));
    return rows.length > 0;
  }
}
