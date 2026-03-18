/** Score breakdown for a single candidate evaluation */
export interface ScoreBreakdown {
  sizeScore: number;
  energyScore: number;
  behaviorScore: number;
  walkScore: number;
  distanceScore: number;
  leashScore: number;
  overallScore: number;
}

/** Log of score breakdown recorded at swipe time */
export interface SwipeScoreLog {
  id: string;
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
  createdAt: Date;
}

/** Personalized matching weights learned from user behavior */
export interface UserMatchingPreferences {
  id: string;
  userId: string;
  weightSize: number;
  weightEnergy: number;
  weightBehavior: number;
  weightWalk: number;
  weightDistance: number;
  weightLeash: number;
  sampleSize: number;
  successRate: number;
  updatedAt: Date;
}

/** Engagement event recorded after a match is created */
export interface MatchInteraction {
  id: string;
  matchId: string;
  userId: string;
  interactionType: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/** Aggregated user activity by day-of-week and hour */
export interface UserActivityWindow {
  id: string;
  userId: string;
  dayOfWeek: number;
  hourOfDay: number;
  activityCount: number;
  updatedAt: Date;
}

/** Optimal time window suggestion */
export interface OptimalTimeWindow {
  dayOfWeek: number;
  hourOfDay: number;
  score: number;
  nearbyActiveUsers: number;
}

/** A compatible dog within a walk suggestion */
export interface WalkSuggestionDog {
  dogId: string;
  dogName: string;
  breed: string;
  compatibilityScore: number;
  distanceKm: number;
}

/** A suggested walk time slot with nearby compatible dogs */
export interface WalkSuggestion {
  timeSlot: { dayOfWeek: number; hourStart: number; hourEnd: number };
  score: number;
  terrainSuggestion: string;
  nearbyCompatibleDogs: WalkSuggestionDog[];
  estimatedDurationMin: number;
}

/** Matching insights for a user */
export interface MatchingInsights {
  totalSwipes: number;
  totalLikes: number;
  totalMatches: number;
  matchRate: number;
  preferredDimensions: Array<{ dimension: string; weight: number }>;
  optimalTimes: OptimalTimeWindow[];
  experimentVariant: string | null;
}
