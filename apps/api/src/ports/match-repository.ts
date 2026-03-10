import type { DogProfile, Match, Swipe, User } from '@dogwalk/types';

export interface CandidateDog {
  dog: DogProfile;
  ownerLat: number | null;
  ownerLon: number | null;
}

export interface MatchRepository {
  findActiveByDogIds(dogIds: string[]): Promise<Match[]>;
  findById(id: string): Promise<Match | null>;
  create(input: { dogAId: string; dogBId: string; compatibilityScore: number }): Promise<Match>;
  softDelete(id: string): Promise<void>;

  // Swipes
  findSwipedDogIds(swiperDogId: string): Promise<string[]>;
  countDailySwipes(swiperDogId: string, since: Date): Promise<number>;
  findSwipe(swiperDogId: string, swipedDogId: string): Promise<Swipe | null>;
  findReciprocalLike(swiperDogId: string, swipedDogId: string): Promise<Swipe | null>;
  createSwipe(input: {
    swiperDogId: string;
    swipedDogId: string;
    direction: 'like' | 'pass';
  }): Promise<Swipe>;

  // Discovery
  findCandidateDogs(excludeOwnerId: string): Promise<CandidateDog[]>;
}
