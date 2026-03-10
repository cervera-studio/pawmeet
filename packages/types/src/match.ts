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
  direction: 'like' | 'pass';
  createdAt: Date;
}
