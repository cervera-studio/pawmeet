import type { FeedbackRating } from '@pawmeet/types';

export interface DogRating {
  average: number | null;
  count: number;
}

export interface WalkFeedbackItem {
  [key: string]: unknown;
}

export interface FeedbackRepository {
  submit(walkId: string, toDogId: string, rating: FeedbackRating, comment?: string): Promise<void>;
  getDogRating(dogId: string): Promise<DogRating>;
  listByWalk(walkId: string): Promise<WalkFeedbackItem[]>;
}
