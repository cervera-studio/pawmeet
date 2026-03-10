import { describe, expect, it } from 'vitest';
import { calculateDistance, formatDistance } from './geo';

describe('calculateDistance', () => {
  it('returns 0 for same point', () => {
    expect(calculateDistance(45.4642, 9.19, 45.4642, 9.19)).toBe(0);
  });

  it('calculates Milan to Rome correctly (~477 km)', () => {
    const distance = calculateDistance(45.4642, 9.19, 41.9028, 12.4964);
    expect(distance).toBeGreaterThan(470);
    expect(distance).toBeLessThan(485);
  });

  it('is symmetric', () => {
    const ab = calculateDistance(45.4642, 9.19, 41.9028, 12.4964);
    const ba = calculateDistance(41.9028, 12.4964, 45.4642, 9.19);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe('formatDistance', () => {
  it('formats sub-km distances in meters', () => {
    expect(formatDistance(0.3)).toBe('300 m');
    expect(formatDistance(0.9)).toBe('900 m');
  });

  it('formats km distances with one decimal', () => {
    expect(formatDistance(2.4)).toBe('2.4 km');
    expect(formatDistance(7.6)).toBe('7.6 km');
  });

  it('formats long distances with one decimal', () => {
    expect(formatDistance(15)).toBe('15.0 km');
  });
});
