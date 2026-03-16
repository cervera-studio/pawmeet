import { dogProfiles, matches, walks } from '@pawmeet/db';
import { and, eq, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  OverdueWalkRow,
  UpcomingWalkRow,
  WalkJobRepository,
} from '../ports/walk-job-repository.js';

export class DrizzleWalkJobRepository implements WalkJobRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async findUpcomingAcceptedWalks(windows: { from: Date; to: Date }[]): Promise<UpcomingWalkRow[]> {
    const windowConditions = windows.map(
      (w) => sql`${walks.scheduledAt} BETWEEN ${w.from} AND ${w.to}`,
    );

    const combinedWindows = windowConditions.reduce((acc, cond) => sql`${acc} OR ${cond}`);

    const upcomingWalks = await this.db
      .select({
        id: walks.id,
        title: walks.title,
        scheduledAt: walks.scheduledAt,
        location: walks.location,
        createdBy: walks.createdBy,
        matchId: walks.matchId,
      })
      .from(walks)
      .where(and(eq(walks.status, 'accepted'), sql`(${combinedWindows})`));

    return upcomingWalks;
  }

  async findOverdueWalks(now: Date, maxAgeMs: number): Promise<OverdueWalkRow[]> {
    const maxAgeDate = new Date(now.getTime() - maxAgeMs);

    const overdueWalks = await this.db
      .select({
        id: walks.id,
        title: walks.title,
        matchId: walks.matchId,
        createdBy: walks.createdBy,
        scheduledAt: walks.scheduledAt,
        durationMin: walks.durationMin,
      })
      .from(walks)
      .where(
        and(
          eq(walks.status, 'accepted'),
          sql`${walks.scheduledAt} + (${walks.durationMin} + 15) * INTERVAL '1 minute' < ${now}`,
          sql`${walks.scheduledAt} > ${maxAgeDate}`,
        ),
      );

    return overdueWalks;
  }

  async getMatchDogOwnerIds(matchId: string): Promise<string[]> {
    const match = await this.db
      .select({ dogAId: matches.dogAId, dogBId: matches.dogBId })
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1);

    if (!match[0]) return [];

    const dogs = await this.db
      .select({ ownerId: dogProfiles.ownerId })
      .from(dogProfiles)
      .where(sql`${dogProfiles.id} IN (${match[0].dogAId}, ${match[0].dogBId})`);

    return dogs.map((d) => d.ownerId);
  }

  async markWalkCompleted(walkId: string, now: Date): Promise<void> {
    await this.db
      .update(walks)
      .set({ status: 'completed', updatedAt: now })
      .where(eq(walks.id, walkId));
  }
}
