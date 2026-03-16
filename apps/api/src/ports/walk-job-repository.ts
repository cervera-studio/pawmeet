export interface UpcomingWalkRow {
  id: string;
  title: string | null;
  scheduledAt: Date;
  location: string | null;
  createdBy: string;
  matchId: string;
}

export interface OverdueWalkRow {
  id: string;
  title: string | null;
  matchId: string;
  createdBy: string;
  scheduledAt: Date;
  durationMin: number | null;
}

export interface WalkJobRepository {
  findUpcomingAcceptedWalks(windows: { from: Date; to: Date }[]): Promise<UpcomingWalkRow[]>;
  findOverdueWalks(now: Date, maxAgeMs: number): Promise<OverdueWalkRow[]>;
  getMatchDogOwnerIds(matchId: string, dogAId?: string, dogBId?: string): Promise<string[]>;
  markWalkCompleted(walkId: string, now: Date): Promise<void>;
}
