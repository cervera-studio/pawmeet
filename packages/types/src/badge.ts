export const BADGE_TYPE = {
  FIRST_MEETING: 'first_meeting',
  REGULAR_WALKER: 'regular_walker',
  SUPER_SOCIAL: 'super_social',
  FRIENDLY_DOG: 'friendly_dog',
  MAIN_EVENT: 'main_event',
} as const;

export type BadgeType = (typeof BADGE_TYPE)[keyof typeof BADGE_TYPE];

export interface Badge {
  id: string;
  dogId: string;
  type: BadgeType;
  awardedAt: Date;
}

/** Criteria thresholds for awarding each badge */
export const BADGE_CRITERIA = {
  /** Awarded after 1 completed walk */
  FIRST_MEETING: { minCompletedWalks: 1 },
  /** Awarded after 5 completed walks */
  REGULAR_WALKER: { minCompletedWalks: 5 },
  /** Awarded after 10 completed walks */
  SUPER_SOCIAL: { minCompletedWalks: 10 },
  /** Awarded when average rating >= 4.0 with at least 3 reviews */
  FRIENDLY_DOG: { minAvgRating: 4.0, minReviews: 3 },
  /** Awarded after participating in 1 official/main event */
  MAIN_EVENT: { minOfficialEvents: 1 },
} as const;
