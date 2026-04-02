import { BEHAVIOR_WITH_DOGS, DOG_SIZE, ENERGY_LEVEL } from '@pawmeet/config';
import { describe, expect, it } from 'vitest';
import {
  calculateBehaviorScore,
  calculateDistanceScore,
  calculateEnergyScore,
  calculateSizeScore,
} from './matching';

describe('calculateSizeScore', () => {
  it('returns 1.0 for same size', () => {
    expect(calculateSizeScore(DOG_SIZE.MEDIUM, DOG_SIZE.MEDIUM)).toBe(1.0);
    expect(calculateSizeScore(DOG_SIZE.TOY, DOG_SIZE.TOY)).toBe(1.0);
    expect(calculateSizeScore(DOG_SIZE.GIANT, DOG_SIZE.GIANT)).toBe(1.0);
  });

  it('returns symmetric scores', () => {
    expect(calculateSizeScore(DOG_SIZE.SMALL, DOG_SIZE.LARGE)).toBe(
      calculateSizeScore(DOG_SIZE.LARGE, DOG_SIZE.SMALL),
    );
  });

  it('returns 0.0 for extreme mismatch', () => {
    expect(calculateSizeScore(DOG_SIZE.TOY, DOG_SIZE.GIANT)).toBe(0.0);
  });

  it('returns higher score for closer sizes', () => {
    expect(calculateSizeScore(DOG_SIZE.MEDIUM, DOG_SIZE.LARGE)).toBeGreaterThan(
      calculateSizeScore(DOG_SIZE.MEDIUM, DOG_SIZE.GIANT),
    );
  });
});

describe('calculateEnergyScore', () => {
  it('returns 1.0 for same energy level', () => {
    expect(calculateEnergyScore(ENERGY_LEVEL.HIGH, ENERGY_LEVEL.HIGH)).toBe(1.0);
  });

  it('returns 0.0 for extreme mismatch', () => {
    expect(calculateEnergyScore(ENERGY_LEVEL.LOW, ENERGY_LEVEL.VERY_HIGH)).toBe(0.0);
  });

  it('returns higher score for closer levels', () => {
    expect(calculateEnergyScore(ENERGY_LEVEL.MEDIUM, ENERGY_LEVEL.HIGH)).toBeGreaterThan(
      calculateEnergyScore(ENERGY_LEVEL.MEDIUM, ENERGY_LEVEL.VERY_HIGH),
    );
  });
});

describe('calculateBehaviorScore', () => {
  it('returns 1.0 for same behavior', () => {
    expect(
      calculateBehaviorScore(BEHAVIOR_WITH_DOGS.VERY_FRIENDLY, BEHAVIOR_WITH_DOGS.VERY_FRIENDLY),
    ).toBe(1.0);
  });

  it('returns 0.0 for two reactive dogs', () => {
    expect(calculateBehaviorScore(BEHAVIOR_WITH_DOGS.REACTIVE, BEHAVIOR_WITH_DOGS.REACTIVE)).toBe(
      0.0,
    );
  });

  it('penalizes reactive with social', () => {
    expect(
      calculateBehaviorScore(BEHAVIOR_WITH_DOGS.VERY_FRIENDLY, BEHAVIOR_WITH_DOGS.REACTIVE),
    ).toBeLessThanOrEqual(0.2);
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
