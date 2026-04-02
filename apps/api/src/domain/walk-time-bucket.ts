export type WalkTimeBucket = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_evening';

export function hourToWalkTime(hour: number): WalkTimeBucket {
  if (hour >= 5 && hour < 7) return 'early_morning';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'late_evening';
}

export function walkTimeBucketToHourRange(bucket: WalkTimeBucket): { start: number; end: number } {
  switch (bucket) {
    case 'early_morning':
      return { start: 5, end: 7 };
    case 'morning':
      return { start: 7, end: 12 };
    case 'afternoon':
      return { start: 12, end: 17 };
    case 'evening':
      return { start: 17, end: 20 };
    case 'late_evening':
      return { start: 20, end: 23 };
  }
}
