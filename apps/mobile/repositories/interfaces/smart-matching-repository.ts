import type { MatchingInsights, OptimalTimeWindow, Serialized } from '@dogwalk/types';

export interface SwipeScores {
  sizeScore: number;
  energyScore: number;
  behaviorScore: number;
  walkScore: number;
  distanceScore: number;
  leashScore: number;
  overallScore: number;
}

export interface SmartMatchingRepository {
  getInsights(dogId: string): Promise<{ insights: Serialized<MatchingInsights> }>;
  getOptimalTimes(dogId: string): Promise<{ windows: Serialized<OptimalTimeWindow>[] }>;
  recordActivity(dayOfWeek: number, hourOfDay: number): Promise<void>;
  logSwipeScores(
    dogId: string,
    targetDogId: string,
    direction: 'like' | 'pass',
    scores: SwipeScores,
  ): Promise<void>;
  learnPreferences(): Promise<void>;
}
