import type { Serialized, Walk } from '@pawmeet/types';

export interface ProposeWalkInput {
  matchId: string;
  scheduledAt: string;
  durationMin?: number;
  title?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface WalkRepository {
  listUpcoming(): Promise<{ walks: Serialized<Walk>[] }>;
  propose(input: ProposeWalkInput): Promise<{ walkId: string }>;
  respond(walkId: string, accept: boolean): Promise<void>;
  cancel(walkId: string): Promise<void>;
  listByMatch(matchId: string): Promise<{ walks: Serialized<Walk>[] }>;
}
