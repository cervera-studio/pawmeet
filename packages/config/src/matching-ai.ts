// ── AI Matching Constants ───────────────────────────────────────────────────

/** Default weights (same as rule-based, used as baseline) */
export const DEFAULT_WEIGHTS = {
  size: 0.25,
  energy: 0.25,
  behavior: 0.2,
  walk: 0.15,
  distance: 0.1,
  leash: 0.05,
} as const;

/** Minimum swipes needed before learning kicks in */
export const MIN_SWIPES_FOR_LEARNING = 15;

/** How much learned weights influence vs defaults (0 = all default, 1 = all learned) */
export const LEARNING_BLEND_FACTOR = 0.6;

// ── Statsig Experiments & Gates ─────────────────────────────────────────────

/** Statsig experiment name for AI matching A/B test */
export const STATSIG_EXPERIMENT = {
  MATCHING_V2: 'matching_v2',
} as const;

/** Statsig feature gate names */
export const STATSIG_GATE = {
  AI_MATCHING: 'ai_matching_enabled',
  VECTOR_MATCHING: 'vector_matching_enabled',
  FRIEND_SYSTEM: 'ff_friend_system',
  EVENTS_V2: 'ff_events_v2',
  MAIN_EVENTS: 'ff_main_events',
  BRAND_SPONSORS: 'ff_brand_sponsors',
} as const;

/** Statsig event names for metrics */
export const STATSIG_EVENT = {
  SWIPE: 'swipe',
  MATCH_CREATED: 'match_created',
  WALK_COMPLETED: 'walk_completed',
  FEEDBACK_GIVEN: 'feedback_given',
} as const;

/** Match interaction types for engagement tracking */
export const MATCH_INTERACTION_TYPE = {
  WALK_COMPLETED: 'walk_completed',
  CHAT_STARTED: 'chat_started',
  FEEDBACK_POSITIVE: 'feedback_positive',
  FEEDBACK_NEGATIVE: 'feedback_negative',
  UNMATCH: 'unmatch',
} as const;

export type MatchInteractionType =
  (typeof MATCH_INTERACTION_TYPE)[keyof typeof MATCH_INTERACTION_TYPE];

/** Maximum number of optimal time windows to return */
export const MAX_OPTIMAL_TIME_WINDOWS = 5;

/** Minimum activity count to consider a time window significant */
export const MIN_ACTIVITY_COUNT_FOR_WINDOW = 3;
