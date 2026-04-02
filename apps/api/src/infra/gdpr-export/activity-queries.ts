import {
  dailyActivity,
  dogMoodLogs,
  walkSafetyCheckins,
  walks,
  walkTrackPoints,
  walkTracks,
} from '@pawmeet/db';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  GdprDailyActivity,
  GdprMoodLog,
  GdprSafetyCheckin,
  GdprWalkTrack,
} from '../../ports/gdpr-export-repository.js';

export function createActivityQueries(db: NodePgDatabase) {
  return {
    async getWalks(matchIds: string[]) {
      if (matchIds.length === 0) return [];
      return db
        .select({
          title: walks.title,
          scheduledAt: walks.scheduledAt,
          durationMin: walks.durationMin,
          location: walks.location,
          latitude: walks.latitude,
          longitude: walks.longitude,
          status: walks.status,
          notes: walks.notes,
          createdAt: walks.createdAt,
        })
        .from(walks)
        .where(inArray(walks.matchId, matchIds));
    },

    async getWalkTracksWithPoints(userId: string): Promise<GdprWalkTrack[]> {
      const trackRows = await db
        .select({
          id: walkTracks.id,
          startedAt: walkTracks.startedAt,
          endedAt: walkTracks.endedAt,
          distanceKm: walkTracks.distanceKm,
          durationMinutes: walkTracks.durationMinutes,
          avgSpeedKmh: walkTracks.avgSpeedKmh,
        })
        .from(walkTracks)
        .where(eq(walkTracks.userId, userId));

      if (trackRows.length === 0) return [];

      const trackIds = trackRows.map((t) => t.id);
      const pointRows = await db
        .select({
          trackId: walkTrackPoints.trackId,
          latitude: walkTrackPoints.latitude,
          longitude: walkTrackPoints.longitude,
          altitude: walkTrackPoints.altitude,
          timestamp: walkTrackPoints.timestamp,
        })
        .from(walkTrackPoints)
        .where(inArray(walkTrackPoints.trackId, trackIds));

      const pointsByTrack = new Map<string, GdprWalkTrack['points']>();
      for (const p of pointRows) {
        const arr = pointsByTrack.get(p.trackId) ?? [];
        arr.push({
          latitude: p.latitude,
          longitude: p.longitude,
          altitude: p.altitude,
          timestamp: p.timestamp,
        });
        pointsByTrack.set(p.trackId, arr);
      }

      return trackRows.map((t) => ({
        startedAt: t.startedAt,
        endedAt: t.endedAt,
        distanceKm: t.distanceKm,
        durationMinutes: t.durationMinutes,
        avgSpeedKmh: t.avgSpeedKmh,
        points: pointsByTrack.get(t.id) ?? [],
      }));
    },

    async getDailyActivity(userId: string): Promise<GdprDailyActivity[]> {
      return db
        .select({
          date: dailyActivity.date,
          stepsCount: dailyActivity.stepsCount,
          walkDistanceKm: dailyActivity.walkDistanceKm,
          walkDurationMin: dailyActivity.walkDurationMin,
          walkCount: dailyActivity.walkCount,
          source: dailyActivity.source,
        })
        .from(dailyActivity)
        .where(eq(dailyActivity.userId, userId));
    },

    async getMoodLogs(userId: string): Promise<GdprMoodLog[]> {
      return db
        .select({
          dogId: dogMoodLogs.dogId,
          trackId: dogMoodLogs.trackId,
          rating: dogMoodLogs.rating,
          tags: dogMoodLogs.tags,
          notes: dogMoodLogs.notes,
          createdAt: dogMoodLogs.createdAt,
        })
        .from(dogMoodLogs)
        .where(eq(dogMoodLogs.userId, userId)) as unknown as GdprMoodLog[];
    },

    async getSafetyCheckins(userId: string): Promise<GdprSafetyCheckin[]> {
      return db
        .select({
          walkId: walkSafetyCheckins.walkId,
          type: walkSafetyCheckins.type,
          latitude: walkSafetyCheckins.latitude,
          longitude: walkSafetyCheckins.longitude,
          createdAt: walkSafetyCheckins.createdAt,
        })
        .from(walkSafetyCheckins)
        .where(eq(walkSafetyCheckins.userId, userId)) as unknown as GdprSafetyCheckin[];
    },
  };
}
