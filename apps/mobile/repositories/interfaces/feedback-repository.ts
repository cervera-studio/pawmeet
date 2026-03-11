import type { FeedbackRating } from '@dogwalk/types';

export interface DogRating {
  average: number | null;
  count: number;
}

export interface FeedbackRepository {
  submit(walkId: string, toDogId: string, rating: FeedbackRating, comment?: string): Promise<void>;
  getDogRating(dogId: string): Promise<DogRating>;
}
