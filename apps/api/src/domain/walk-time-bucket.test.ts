import { WALK_TIME } from '@pawmeet/config';
import { describe, expect, it } from 'vitest';
import { hourToWalkTime, walkTimeBucketToHourRange } from './walk-time-bucket.js';

describe('hourToWalkTime', () => {
  it('maps 5-6 to early_morning', () => {
    expect(hourToWalkTime(5)).toBe(WALK_TIME.EARLY_MORNING);
    expect(hourToWalkTime(6)).toBe(WALK_TIME.EARLY_MORNING);
  });

  it('maps 7-11 to morning', () => {
    expect(hourToWalkTime(7)).toBe(WALK_TIME.MORNING);
    expect(hourToWalkTime(11)).toBe(WALK_TIME.MORNING);
  });

  it('maps 12-16 to afternoon', () => {
    expect(hourToWalkTime(12)).toBe(WALK_TIME.AFTERNOON);
    expect(hourToWalkTime(16)).toBe(WALK_TIME.AFTERNOON);
  });

  it('maps 17-19 to evening', () => {
    expect(hourToWalkTime(17)).toBe(WALK_TIME.EVENING);
    expect(hourToWalkTime(19)).toBe(WALK_TIME.EVENING);
  });

  it('maps 20-23 and 0-4 to late_evening', () => {
    expect(hourToWalkTime(20)).toBe(WALK_TIME.LATE_EVENING);
    expect(hourToWalkTime(23)).toBe(WALK_TIME.LATE_EVENING);
    expect(hourToWalkTime(0)).toBe(WALK_TIME.LATE_EVENING);
    expect(hourToWalkTime(4)).toBe(WALK_TIME.LATE_EVENING);
  });
});

describe('walkTimeBucketToHourRange', () => {
  it('returns correct range for early_morning', () => {
    expect(walkTimeBucketToHourRange(WALK_TIME.EARLY_MORNING)).toEqual({ start: 5, end: 7 });
  });

  it('returns correct range for morning', () => {
    expect(walkTimeBucketToHourRange(WALK_TIME.MORNING)).toEqual({ start: 7, end: 12 });
  });

  it('returns correct range for afternoon', () => {
    expect(walkTimeBucketToHourRange(WALK_TIME.AFTERNOON)).toEqual({ start: 12, end: 17 });
  });

  it('returns correct range for evening', () => {
    expect(walkTimeBucketToHourRange(WALK_TIME.EVENING)).toEqual({ start: 17, end: 20 });
  });

  it('returns correct range for late_evening', () => {
    expect(walkTimeBucketToHourRange(WALK_TIME.LATE_EVENING)).toEqual({ start: 20, end: 23 });
  });
});
