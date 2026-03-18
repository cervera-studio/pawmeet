import type { MoodLog, MoodTag, Serialized } from '@pawmeet/types';

export interface MoodLogRepository {
  submit(input: {
    dogId: string;
    trackId: string;
    rating: number;
    tags: MoodTag[];
    notes?: string;
  }): Promise<Serialized<MoodLog>>;
  listByDog(
    dogId: string,
    cursor?: string | null,
    limit?: number,
  ): Promise<{ logs: Serialized<MoodLog>[]; nextCursor: string | null }>;
}
