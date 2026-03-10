export const FEEDBACK_RATING = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
} as const;

export type FeedbackRating = (typeof FEEDBACK_RATING)[keyof typeof FEEDBACK_RATING];

export interface WalkFeedback {
  id: string;
  walkId: string;
  fromUserId: string;
  toDogId: string;
  rating: FeedbackRating;
  comment: string | null;
  createdAt: Date;
}
