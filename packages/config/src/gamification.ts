// ── XP Action Points ────────────────────────────────────────────────────────

export const XP_ACTION = {
  WALK_COMPLETED: 'walk_completed',
  MATCH_MADE: 'match_made',
  FEEDBACK_GIVEN: 'feedback_given',
  GROUP_EVENT_JOINED: 'group_event_joined',
  GROUP_EVENT_CREATED: 'group_event_created',
  CHALLENGE_COMPLETED: 'challenge_completed',
  POST_CREATED: 'post_created',
  STORY_CREATED: 'story_created',
  WALK_TRACKED: 'walk_tracked',
} as const;

export type XpAction = (typeof XP_ACTION)[keyof typeof XP_ACTION];

export const XP_POINTS: Record<XpAction, number> = {
  [XP_ACTION.WALK_COMPLETED]: 50,
  [XP_ACTION.MATCH_MADE]: 30,
  [XP_ACTION.FEEDBACK_GIVEN]: 10,
  [XP_ACTION.GROUP_EVENT_JOINED]: 20,
  [XP_ACTION.GROUP_EVENT_CREATED]: 40,
  [XP_ACTION.CHALLENGE_COMPLETED]: 100,
  [XP_ACTION.POST_CREATED]: 15,
  [XP_ACTION.STORY_CREATED]: 10,
  [XP_ACTION.WALK_TRACKED]: 25,
} as const;

// ── User Levels ─────────────────────────────────────────────────────────────

export const USER_LEVEL = {
  CUCCIOLO: 'cucciolo',
  ESPLORATORE: 'esploratore',
  ALPHA: 'alpha',
  LEGGENDA: 'leggenda',
} as const;

export type UserLevel = (typeof USER_LEVEL)[keyof typeof USER_LEVEL];

/**
 * Level thresholds sorted ascending by minXp.
 * Level is determined by finding the highest threshold the user meets.
 */
export const LEVEL_THRESHOLDS = [
  { level: USER_LEVEL.CUCCIOLO, minXp: 0, maxXp: 99 },
  { level: USER_LEVEL.ESPLORATORE, minXp: 100, maxXp: 499 },
  { level: USER_LEVEL.ALPHA, minXp: 500, maxXp: 1999 },
  { level: USER_LEVEL.LEGGENDA, minXp: 2000, maxXp: Infinity },
] as const;

/** Compute the user level from total XP. */
export function computeLevelFromXp(totalXp: number): {
  level: UserLevel;
  xpToNextLevel: number | null;
} {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i] as (typeof LEVEL_THRESHOLDS)[number];
    if (totalXp >= threshold.minXp) {
      const xpToNextLevel = threshold.maxXp === Infinity ? null : threshold.maxXp - totalXp + 1;
      return { level: threshold.level, xpToNextLevel };
    }
  }
  // Fallback (should never happen with minXp: 0)
  return { level: USER_LEVEL.CUCCIOLO, xpToNextLevel: 100 - totalXp };
}

// ── Achievement Types ───────────────────────────────────────────────────────

export const ACHIEVEMENT_TYPE = {
  FIRST_WALK: 'first_walk',
  WALKS_10: 'walks_10',
  WALKS_50: 'walks_50',
  WALKS_100: 'walks_100',
  FIRST_MATCH: 'first_match',
  MATCHES_10: 'matches_10',
  FIRST_GROUP_EVENT: 'first_group_event',
  SOCIAL_BUTTERFLY: 'social_butterfly',
  MARATHON_WALKER: 'marathon_walker',
} as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPE)[keyof typeof ACHIEVEMENT_TYPE];

// ── Challenge Types ─────────────────────────────────────────────────────────

export const CHALLENGE_TYPE = {
  WALK_COUNT: 'walk_count',
  WALK_DISTANCE_KM: 'walk_distance_km',
  NEW_MATCHES: 'new_matches',
  GROUP_EVENTS_JOINED: 'group_events_joined',
} as const;

export type ChallengeType = (typeof CHALLENGE_TYPE)[keyof typeof CHALLENGE_TYPE];

// ── Streak Types ────────────────────────────────────────────────────────────

export const STREAK_TYPE = {
  DAILY_WALK: 'daily_walk',
} as const;

export type StreakType = (typeof STREAK_TYPE)[keyof typeof STREAK_TYPE];

// ── Leaderboard ─────────────────────────────────────────────────────────────

export const LEADERBOARD_TYPE = {
  WEEKLY: 'weekly',
  ALL_TIME: 'allTime',
} as const;

export type LeaderboardType = (typeof LEADERBOARD_TYPE)[keyof typeof LEADERBOARD_TYPE];

export const DEFAULT_LEADERBOARD_LIMIT = 20;
export const MAX_LEADERBOARD_LIMIT = 100;
