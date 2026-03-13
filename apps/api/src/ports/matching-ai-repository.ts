import type { MatchInteractionType } from '@pawmeet/config';
import type {
  MatchInteraction,
  SwipeScoreLog,
  UserActivityWindow,
  UserMatchingPreferences,
} from '@pawmeet/types';

export interface MatchingAiRepository {
  // Swipe score logs
  createSwipeScoreLog(input: {
    swiperDogId: string;
    swipedDogId: string;
    direction: 'like' | 'pass';
    sizeScore: number;
    energyScore: number;
    behaviorScore: number;
    walkScore: number;
    distanceScore: number;
    leashScore: number;
    overallScore: number;
  }): Promise<SwipeScoreLog>;

  findSwipeScoreLogsByDog(
    dogId: string,
    options?: { limit?: number; cursor?: string | null },
  ): Promise<{ logs: SwipeScoreLog[]; nextCursor: string | null }>;

  // User matching preferences
  findUserPreferences(userId: string): Promise<UserMatchingPreferences | null>;

  upsertUserPreferences(input: {
    userId: string;
    weightSize: number;
    weightEnergy: number;
    weightBehavior: number;
    weightWalk: number;
    weightDistance: number;
    weightLeash: number;
    sampleSize: number;
    successRate: number;
  }): Promise<UserMatchingPreferences>;

  // Match interactions
  createMatchInteraction(input: {
    matchId: string;
    userId: string;
    interactionType: MatchInteractionType;
    metadata?: Record<string, unknown>;
  }): Promise<MatchInteraction>;

  findInteractionsByMatches(matchIds: string[]): Promise<MatchInteraction[]>;

  // User activity windows
  upsertActivityWindow(input: {
    userId: string;
    dayOfWeek: number;
    hourOfDay: number;
  }): Promise<UserActivityWindow>;

  findActivityWindowsByUser(userId: string): Promise<UserActivityWindow[]>;

  findNearbyActivityWindows(
    excludeUserId: string,
    dayOfWeek: number,
    hourOfDay: number,
  ): Promise<Array<{ userId: string; activityCount: number }>>;

  // A/B experiments managed via Statsig — no custom DB methods needed
}
