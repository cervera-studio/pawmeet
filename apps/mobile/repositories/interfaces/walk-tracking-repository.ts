import type { Serialized, WalkTrack } from '@dogwalk/types';

export interface TrackPointInput {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: string;
  speedKmh: number | null;
  position: number;
}

export interface WalkTrackingRepository {
  startTracking(walkId?: string): Promise<{ track: Serialized<WalkTrack> }>;
  addPoints(trackId: string, points: TrackPointInput[]): Promise<void>;
  endTracking(trackId: string): Promise<{ track: Serialized<WalkTrack> }>;
}
