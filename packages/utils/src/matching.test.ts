import { describe, expect, it } from 'vitest';
import {
  calculateBehaviorScore,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from './matching';

describe('calculateSizeScore', () => {
  it('returns 1.0 for same size', () => {
    expect(calculateSizeScore('medium', 'medium')).toBe(1.0);
    expect(calculateSizeScore('toy', 'toy')).toBe(1.0);
    expect(calculateSizeScore('giant', 'giant')).toBe(1.0);
  });

  it('returns symmetric scores', () => {
    expect(calculateSizeScore('small', 'large')).toBe(calculateSizeScore('large', 'small'));
  });

  it('returns 0.0 for extreme mismatch', () => {
    expect(calculateSizeScore('toy', 'giant')).toBe(0.0);
  });

  it('returns higher score for closer sizes', () => {
    expect(calculateSizeScore('medium', 'large')).toBeGreaterThan(
      calculateSizeScore('medium', 'giant'),
    );
  });
});

describe('calculateEnergyScore', () => {
  it('returns 1.0 for same energy level', () => {
    expect(calculateEnergyScore('high', 'high')).toBe(1.0);
  });

  it('returns 0.0 for extreme mismatch', () => {
    expect(calculateEnergyScore('low', 'very_high')).toBe(0.0);
  });

  it('returns higher score for closer levels', () => {
    expect(calculateEnergyScore('medium', 'high')).toBeGreaterThan(
      calculateEnergyScore('medium', 'very_high'),
    );
  });
});

describe('calculateBehaviorScore', () => {
  it('returns 1.0 for same behavior', () => {
    expect(calculateBehaviorScore('very_friendly', 'very_friendly')).toBe(1.0);
  });

  it('returns 0.0 for two reactive dogs', () => {
    expect(calculateBehaviorScore('reactive', 'reactive')).toBe(0.0);
  });

  it('penalizes reactive with social', () => {
    expect(calculateBehaviorScore('very_friendly', 'reactive')).toBeLessThanOrEqual(0.2);
  });
});

describe('calculateDistanceScore', () => {
  it('returns 1.0 for distance 0', () => {
    expect(calculateDistanceScore(0)).toBe(1.0);
  });

  it('decreases with distance', () => {
    expect(calculateDistanceScore(1)).toBeGreaterThan(calculateDistanceScore(5));
    expect(calculateDistanceScore(5)).toBeGreaterThan(calculateDistanceScore(10));
  });

  it('approaches 0 for large distances', () => {
    expect(calculateDistanceScore(50)).toBeLessThan(0.01);
  });
});
