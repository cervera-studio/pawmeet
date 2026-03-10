import type { WalkFeedback } from '@dogwalk/types';

export interface FeedbackRepository {
  create(feedback: Omit<WalkFeedback, 'id' | 'createdAt'>): Promise<WalkFeedback>;
  findByWalk(walkId: string): Promise<WalkFeedback[]>;
  findByDog(dogId: string): Promise<WalkFeedback[]>;
  getAverageRating(dogId: string): Promise<{ average: number | null; count: number }>;
  hasSubmitted(walkId: string, userId: string): Promise<boolean>;
}
