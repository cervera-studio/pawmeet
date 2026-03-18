import type { MoodLog } from '@pawmeet/types';

export interface MoodLogRepository {
  create(input: Omit<MoodLog, 'id' | 'createdAt'>): Promise<MoodLog>;
  findByDog(
    dogId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ logs: MoodLog[]; nextCursor: string | null }>;
  findByTrack(trackId: string, dogId: string): Promise<MoodLog | null>;
}
