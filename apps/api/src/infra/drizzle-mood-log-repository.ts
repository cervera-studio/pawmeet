import { dogMoodLogs } from '@pawmeet/db';
import type { MoodLog } from '@pawmeet/types';
import { and, desc, eq, lt } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { MoodLogRepository } from '../ports/mood-log-repository.js';
import { firstRow, rowsAs } from './drizzle-helpers.js';

export class DrizzleMoodLogRepository implements MoodLogRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async create(input: Omit<MoodLog, 'id' | 'createdAt'>): Promise<MoodLog> {
    const rows = await this.db.insert(dogMoodLogs).values(input).returning();
    return firstRow<MoodLog>(rows);
  }

  async findByDog(
    dogId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ logs: MoodLog[]; nextCursor: string | null }> {
    const query = this.db
      .select()
      .from(dogMoodLogs)
      .where(
        cursor
          ? and(eq(dogMoodLogs.dogId, dogId), lt(dogMoodLogs.id, cursor))
          : eq(dogMoodLogs.dogId, dogId),
      )
      .orderBy(desc(dogMoodLogs.createdAt))
      .limit(limit + 1);

    const rows = rowsAs<MoodLog>(await query);
    const hasMore = rows.length > limit;
    const logs = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (logs.at(-1)?.id ?? null) : null;

    return { logs, nextCursor };
  }

  async findByTrack(trackId: string, dogId: string): Promise<MoodLog | null> {
    const rows = await this.db
      .select()
      .from(dogMoodLogs)
      .where(and(eq(dogMoodLogs.trackId, trackId), eq(dogMoodLogs.dogId, dogId)));

    return rows.length > 0 ? (rows[0] as MoodLog) : null;
  }
}
