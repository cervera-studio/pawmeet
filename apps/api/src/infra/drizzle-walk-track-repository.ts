import { walkTrackPoints, walkTracks } from '@pawmeet/db';
import type { WalkTrack, WalkTrackPoint } from '@pawmeet/types';
import { and, asc, desc, eq, lt, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { WalkTrackRepository } from '../ports/walk-track-repository.js';

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [iso, id] = decoded.split('|');
    if (!(iso && id)) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return { createdAt: date, id };
  } catch {
    return null;
  }
}

export class DrizzleWalkTrackRepository implements WalkTrackRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async startTrack(userId: string, walkId: string | null): Promise<WalkTrack> {
    const rows = await this.db.insert(walkTracks).values({ userId, walkId }).returning();
    return rows[0] as WalkTrack;
  }

  async addPoints(
    trackId: string,
    points: Array<{
      latitude: number;
      longitude: number;
      altitude: number | null;
      timestamp: Date;
      speedKmh: number | null;
      position: number;
    }>,
  ): Promise<void> {
    if (points.length === 0) return;
    await this.db.insert(walkTrackPoints).values(
      points.map((p) => ({
        trackId,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        timestamp: p.timestamp,
        speedKmh: p.speedKmh,
        position: p.position,
      })),
    );
  }

  async endTrack(
    trackId: string,
    summary: { distanceKm: number; durationMinutes: number; avgSpeedKmh: number },
  ): Promise<WalkTrack | null> {
    const rows = await this.db
      .update(walkTracks)
      .set({
        distanceKm: summary.distanceKm,
        durationMinutes: summary.durationMinutes,
        avgSpeedKmh: summary.avgSpeedKmh,
        endedAt: new Date(),
        isCompleted: true,
      })
      .where(eq(walkTracks.id, trackId))
      .returning();
    return (rows[0] as WalkTrack | undefined) ?? null;
  }

  async findById(trackId: string): Promise<WalkTrack | null> {
    const [row] = await this.db.select().from(walkTracks).where(eq(walkTracks.id, trackId));
    return (row as WalkTrack | undefined) ?? null;
  }

  async findByWalk(walkId: string): Promise<WalkTrack | null> {
    const [row] = await this.db.select().from(walkTracks).where(eq(walkTracks.walkId, walkId));
    return (row as WalkTrack | undefined) ?? null;
  }

  async findByUser(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ tracks: WalkTrack[]; nextCursor: string | null }> {
    const baseWhere = eq(walkTracks.userId, userId);

    let query = this.db
      .select()
      .from(walkTracks)
      .where(baseWhere)
      .orderBy(desc(walkTracks.createdAt), desc(walkTracks.id))
      .limit(limit + 1);

    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        query = this.db
          .select()
          .from(walkTracks)
          .where(
            and(
              baseWhere,
              or(
                lt(walkTracks.createdAt, parsed.createdAt),
                and(eq(walkTracks.createdAt, parsed.createdAt), lt(walkTracks.id, parsed.id)),
              ),
            ),
          )
          .orderBy(desc(walkTracks.createdAt), desc(walkTracks.id))
          .limit(limit + 1);
      }
    }

    const rows = await query;

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const lastRow = pageRows.at(-1);
    const nextCursor =
      hasMore && lastRow ? encodeCursor(lastRow.createdAt as Date, lastRow.id) : null;

    return {
      tracks: pageRows as WalkTrack[],
      nextCursor,
    };
  }

  async findPointsByTrack(trackId: string): Promise<WalkTrackPoint[]> {
    const rows = await this.db
      .select()
      .from(walkTrackPoints)
      .where(eq(walkTrackPoints.trackId, trackId))
      .orderBy(asc(walkTrackPoints.position));
    return rows as WalkTrackPoint[];
  }
}
