import type { WalkTrack, WalkTrackPoint } from '@dogwalk/types';

export interface WalkTrackRepository {
  startTrack(userId: string, walkId: string | null): Promise<WalkTrack>;
  addPoints(
    trackId: string,
    points: Array<{
      latitude: number;
      longitude: number;
      altitude: number | null;
      timestamp: Date;
      speedKmh: number | null;
      position: number;
    }>,
  ): Promise<void>;
  endTrack(
    trackId: string,
    summary: { distanceKm: number; durationMinutes: number; avgSpeedKmh: number },
  ): Promise<WalkTrack | null>;
  findById(trackId: string): Promise<WalkTrack | null>;
  findByWalk(walkId: string): Promise<WalkTrack | null>;
  findByUser(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ tracks: WalkTrack[]; nextCursor: string | null }>;
  findPointsByTrack(trackId: string): Promise<WalkTrackPoint[]>;
}
