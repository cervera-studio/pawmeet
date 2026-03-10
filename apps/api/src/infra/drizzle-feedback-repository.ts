import { walkFeedback } from '@dogwalk/db';
import type { WalkFeedback } from '@dogwalk/types';
import { and, avg, count, eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { FeedbackRepository } from '../ports/feedback-repository.js';

export class DrizzleFeedbackRepository implements FeedbackRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async create(feedback: Omit<WalkFeedback, 'id' | 'createdAt'>): Promise<WalkFeedback> {
    const rows = await this.db.insert(walkFeedback).values(feedback).returning();
    return rows[0] as WalkFeedback;
  }

  async findByWalk(walkId: string): Promise<WalkFeedback[]> {
    const rows = await this.db.select().from(walkFeedback).where(eq(walkFeedback.walkId, walkId));
    return rows as WalkFeedback[];
  }

  async findByDog(dogId: string): Promise<WalkFeedback[]> {
    const rows = await this.db.select().from(walkFeedback).where(eq(walkFeedback.toDogId, dogId));
    return rows as WalkFeedback[];
  }

  async getAverageRating(dogId: string): Promise<{ average: number | null; count: number }> {
    const [result] = await this.db
      .select({
        average: avg(walkFeedback.rating),
        count: count(),
      })
      .from(walkFeedback)
      .where(eq(walkFeedback.toDogId, dogId));

    return {
      average: result?.average ? Number(result.average) : null,
      count: result?.count ?? 0,
    };
  }

  async hasSubmitted(walkId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: walkFeedback.id })
      .from(walkFeedback)
      .where(and(eq(walkFeedback.walkId, walkId), eq(walkFeedback.fromUserId, userId)));

    return rows.length > 0;
  }
}
