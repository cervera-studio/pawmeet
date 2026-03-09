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
  it('formats sub-km distances', () => {
    expect(formatDistance(0.3)).toBe('< 1 km');
    expect(formatDistance(0.9)).toBe('< 1 km');
  });

  it('formats short distances with rounding', () => {
    expect(formatDistance(2.4)).toBe('~2 km');
    expect(formatDistance(7.6)).toBe('~8 km');
  });

  it('formats long distances', () => {
    expect(formatDistance(15)).toBe('> 10 km');
  });
});
