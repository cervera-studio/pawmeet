// ── GPS Tracking ─────────────────────────────────────────────────────────────

/** Minimum interval between GPS point batches (ms) */
export const TRACK_POINT_BATCH_INTERVAL_MS = 10_000;

/** Maximum number of track points per batch */
export const MAX_TRACK_POINTS_PER_BATCH = 50;

/** Maximum track duration in hours */
export const MAX_TRACK_DURATION_HOURS = 8;

/** Minimum distance between consecutive points to store (meters) */
export const MIN_POINT_DISTANCE_METERS = 5;

// ── Activity Goals ───────────────────────────────────────────────────────────

export const DOG_SIZE_CATEGORY = {
  TOY: 'toy',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  GIANT: 'giant',
} as const;

export type DogSizeCategory = (typeof DOG_SIZE_CATEGORY)[keyof typeof DOG_SIZE_CATEGORY];

/** Recommended daily walk minutes by dog size */
export const BREED_ACTIVITY_GOALS = {
  [DOG_SIZE_CATEGORY.TOY]: 30,
  [DOG_SIZE_CATEGORY.SMALL]: 45,
  [DOG_SIZE_CATEGORY.MEDIUM]: 60,
  [DOG_SIZE_CATEGORY.LARGE]: 75,
  [DOG_SIZE_CATEGORY.GIANT]: 60,
} as const satisfies Record<DogSizeCategory, number>;

// ── Health Data Sync ─────────────────────────────────────────────────────────

export const HEALTH_DATA_SOURCE = {
  APP: 'app',
  HEALTH_KIT: 'health_kit',
  GOOGLE_FIT: 'google_fit',
} as const;

export type HealthDataSource = (typeof HEALTH_DATA_SOURCE)[keyof typeof HEALTH_DATA_SOURCE];

/** Maximum days of historical health data that can be synced at once */
export const MAX_HEALTH_SYNC_DAYS = 30;
