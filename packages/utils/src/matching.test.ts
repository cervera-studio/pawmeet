import { describe, it, expect } from 'vitest';
import {
  calculateSizeScore,
  calculateEnergyScore,
  calculateBehaviorScore,
  calculateDistanceScore,
} from './matching';

describe('calculateSizeScore', () => {
  it('returns 1.0 for same size', () => {
    expect(calculateSizeScore('media', 'media')).toBe(1.0);
    expect(calculateSizeScore('toy', 'toy')).toBe(1.0);
    expect(calculateSizeScore('gigante', 'gigante')).toBe(1.0);
  });

  it('returns symmetric scores', () => {
    expect(calculateSizeScore('piccola', 'grande')).toBe(
      calculateSizeScore('grande', 'piccola'),
    );
  });

  it('returns 0.0 for extreme mismatch', () => {
    expect(calculateSizeScore('toy', 'gigante')).toBe(0.0);
  });

  it('returns higher score for closer sizes', () => {
    expect(calculateSizeScore('media', 'grande')).toBeGreaterThan(
      calculateSizeScore('media', 'gigante'),
    );
  });
});

describe('calculateEnergyScore', () => {
  it('returns 1.0 for same energy level', () => {
    expect(calculateEnergyScore('alta', 'alta')).toBe(1.0);
  });

  it('returns 0.0 for extreme mismatch', () => {
    expect(calculateEnergyScore('bassa', 'molto_alta')).toBe(0.0);
  });

  it('returns higher score for closer levels', () => {
    expect(calculateEnergyScore('media', 'alta')).toBeGreaterThan(
      calculateEnergyScore('media', 'molto_alta'),
    );
  });
});

describe('calculateBehaviorScore', () => {
  it('returns 1.0 for same behavior', () => {
    expect(calculateBehaviorScore('molto_socievole', 'molto_socievole')).toBe(1.0);
  });

  it('returns 0.0 for two reactive dogs', () => {
    expect(calculateBehaviorScore('reattivo', 'reattivo')).toBe(0.0);
  });

  it('penalizes reactive with social', () => {
    expect(calculateBehaviorScore('molto_socievole', 'reattivo')).toBeLessThanOrEqual(0.2);
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
