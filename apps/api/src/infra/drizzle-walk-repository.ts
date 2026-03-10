import { dogProfiles, matches, walks } from '@dogwalk/db';
import type { Walk, WalkStatus } from '@dogwalk/types';
import { and, eq, gt, inArray, or } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { WalkRepository } from '../ports/walk-repository.js';

export class DrizzleWalkRepository implements WalkRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async create(walk: Omit<Walk, 'id' | 'createdAt' | 'updatedAt'>): Promise<Walk> {
    const rows = await this.db.insert(walks).values(walk).returning();
    return rows[0] as Walk;
  }

  async findById(id: string): Promise<Walk | null> {
    const [walk] = await this.db.select().from(walks).where(eq(walks.id, id));
    return (walk as Walk | undefined) ?? null;
  }

  async findByMatchId(matchId: string): Promise<Walk[]> {
    const rows = await this.db.select().from(walks).where(eq(walks.matchId, matchId));
    return rows as Walk[];
  }

  async findUpcoming(userId: string): Promise<Walk[]> {
    // Find all dogs owned by this user
    const userDogs = await this.db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(eq(dogProfiles.ownerId, userId));

    if (userDogs.length === 0) return [];

    const dogIds = userDogs.map((d) => d.id);

    // Find all active matches where user's dogs participate
    const userMatches = await this.db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.isActive, true),
          or(
            ...dogIds.map((id) => eq(matches.dogAId, id)),
            ...dogIds.map((id) => eq(matches.dogBId, id)),
          ),
        ),
      );

    if (userMatches.length === 0) return [];

    const matchIds = userMatches.map((m) => m.id);

    // Find upcoming walks for those matches
    const rows = await this.db
      .select()
      .from(walks)
      .where(
        and(
          inArray(walks.matchId, matchIds),
          gt(walks.scheduledAt, new Date()),
          inArray(walks.status, ['pending', 'accepted']),
        ),
      );

    // Sort by scheduledAt ascending
    return (rows as Walk[]).sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  }

  async updateStatus(id: string, status: WalkStatus): Promise<Walk> {
    const rows = await this.db
      .update(walks)
      .set({ status, updatedAt: new Date() })
      .where(eq(walks.id, id))
      .returning();
    return rows[0] as Walk;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(walks).where(eq(walks.id, id));
  }
}
