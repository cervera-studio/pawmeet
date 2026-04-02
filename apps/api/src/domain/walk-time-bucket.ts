import { WALK_TIME } from '@pawmeet/config';
import type { WalkTime } from '@pawmeet/types';

export type WalkTimeBucket = WalkTime;

export function hourToWalkTime(hour: number): WalkTimeBucket {
  if (hour >= 5 && hour < 7) return WALK_TIME.EARLY_MORNING;
  if (hour >= 7 && hour < 12) return WALK_TIME.MORNING;
  if (hour >= 12 && hour < 17) return WALK_TIME.AFTERNOON;
  if (hour >= 17 && hour < 20) return WALK_TIME.EVENING;
  return WALK_TIME.LATE_EVENING;
}

export function walkTimeBucketToHourRange(bucket: WalkTimeBucket): { start: number; end: number } {
  switch (bucket) {
    case WALK_TIME.EARLY_MORNING:
      return { start: 5, end: 7 };
    case WALK_TIME.MORNING:
      return { start: 7, end: 12 };
    case WALK_TIME.AFTERNOON:
      return { start: 12, end: 17 };
    case WALK_TIME.EVENING:
      return { start: 17, end: 20 };
    case WALK_TIME.LATE_EVENING:
      return { start: 20, end: 23 };
  }
}
