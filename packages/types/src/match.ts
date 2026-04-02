export const SWIPE_DIRECTION = {
  LIKE: 'like',
  PASS: 'pass',
} as const;

export type SwipeDirection = (typeof SWIPE_DIRECTION)[keyof typeof SWIPE_DIRECTION];

export interface Match {
  id: string;
  dogAId: string;
  dogBId: string;
  compatibilityScore: number;
  createdAt: Date;
  isActive: boolean;
}

export interface Swipe {
  id: string;
  swiperDogId: string;
  swipedDogId: string;
  direction: SwipeDirection;
  createdAt: Date;
}
