import type { Walk, WalkStatus } from '@dogwalk/types';

export interface WalkRepository {
  create(walk: Omit<Walk, 'id' | 'createdAt' | 'updatedAt'>): Promise<Walk>;
  findById(id: string): Promise<Walk | null>;
  findByMatchId(matchId: string): Promise<Walk[]>;
  findUpcoming(userId: string): Promise<Walk[]>;
  updateStatus(id: string, status: WalkStatus): Promise<Walk>;
  delete(id: string): Promise<void>;
  countCompletedForDog(dogId: string): Promise<number>;
  getAverageRatingForDog(dogId: string): Promise<{ average: number; count: number }>;
}
