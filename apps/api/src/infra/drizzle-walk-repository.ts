import { matches, walkFeedback, walks } from '@pawmeet/db';
import type { Walk, WalkStatus } from '@pawmeet/types';
import { and, avg, count, eq, inArray, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { WalkRepository } from '../ports/walk-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleWalkRepository implements WalkRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async create(walk: Omit<Walk, 'id' | 'createdAt' | 'updatedAt'>): Promise<Walk> {
    const rows = await this.db.insert(walks).values(walk).returning();
    return firstRow<Walk>(rows);
  }

  async findById(id: string): Promise<Walk | null> {
    const rows = await this.db.select().from(walks).where(eq(walks.id, id));
    return firstRowOrNull<Walk>(rows);
  }

  async findByMatchId(matchId: string): Promise<Walk[]> {
    const rows = await this.db.select().from(walks).where(eq(walks.matchId, matchId));
    return rowsAs<Walk>(rows);
  }

  async findUpcoming(userId: string): Promise<Walk[]> {
    // Single CTE query: user dogs → active matches → upcoming walks
    const result = await this.db.execute(sql`
      WITH user_dogs AS (
        SELECT id FROM dog_profiles
        WHERE owner_id = ${userId}
      ),
      user_matches AS (
        SELECT m.id
        FROM matches m
        JOIN user_dogs ud ON (m.dog_a_id = ud.id OR m.dog_b_id = ud.id)
        WHERE m.is_active = true
      )
      SELECT w.*
      FROM walks w
      JOIN user_matches um ON w.match_id = um.id
      WHERE w.scheduled_at > NOW()
        AND w.status IN ('pending', 'accepted')
      ORDER BY w.scheduled_at ASC
    `);

    return rowsAs<Walk>(result.rows as Record<string, unknown>[]);
  }

  async updateStatus(id: string, status: WalkStatus): Promise<Walk> {
    const rows = await this.db
      .update(walks)
      .set({ status, updatedAt: new Date() })
      .where(eq(walks.id, id))
      .returning();
    return firstRow<Walk>(rows);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(walks).where(eq(walks.id, id));
  }

  async countCompletedForDog(dogId: string): Promise<number> {
    // Find all matches where this dog participates
    const dogMatches = await this.db
      .select({ id: matches.id })
      .from(matches)
      .where(or(eq(matches.dogAId, dogId), eq(matches.dogBId, dogId)));

    if (dogMatches.length === 0) return 0;

    const matchIds = dogMatches.map((m) => m.id);

    const [result] = await this.db
      .select({ total: count() })
      .from(walks)
      .where(and(inArray(walks.matchId, matchIds), eq(walks.status, 'completed')));

    return result?.total ?? 0;
  }

  async getAverageRatingForDog(dogId: string): Promise<{ average: number; count: number }> {
    const [result] = await this.db
      .select({
        average: avg(walkFeedback.rating),
        total: count(),
      })
      .from(walkFeedback)
      .where(eq(walkFeedback.toDogId, dogId));

    return {
      average: result?.average ? Number(result.average) : 0,
      count: result?.total ?? 0,
    };
  }
}
