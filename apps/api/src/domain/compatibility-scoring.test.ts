import {
  BEHAVIOR_WITH_DOGS,
  DOG_SIZE,
  ENERGY_LEVEL,
  LEASH_BEHAVIOR,
  WALK_TERRAIN,
  WALK_TIME,
} from '@pawmeet/config';
import { describe, expect, it } from 'vitest';
import { buildDog } from '../test-utils/builders.js';
import {
  LEASH_SCORES,
  WEIGHT_BEHAVIOR,
  WEIGHT_DISTANCE,
  WEIGHT_ENERGY,
  WEIGHT_LEASH,
  WEIGHT_SIZE,
  WEIGHT_WALK,
  calculateLeashScore,
  calculateWalkScore,
} from './compatibility-scoring.js';

describe('weights', () => {
  it('sum to 1.0', () => {
    const sum =
      WEIGHT_SIZE + WEIGHT_ENERGY + WEIGHT_BEHAVIOR + WEIGHT_WALK + WEIGHT_DISTANCE + WEIGHT_LEASH;
    expect(sum).toBeCloseTo(1.0);
  });
});

describe('calculateLeashScore', () => {
  it('returns 1 for identical behaviors', () => {
    expect(calculateLeashScore('excellent', 'excellent')).toBe(1);
    expect(calculateLeashScore('good', 'good')).toBe(1);
  });

  it('returns lower score for different behaviors', () => {
    const score = calculateLeashScore('excellent', 'difficult');
    // 1 - |1.0 - 0.1| = 0.1
    expect(score).toBeCloseTo(0.1);
  });

  it('uses 0.5 as fallback for unknown behavior', () => {
    const score = calculateLeashScore('excellent', 'unknown_value');
    // 1 - |1.0 - 0.5| = 0.5
    expect(score).toBeCloseTo(0.5);
  });

  it('returns expected score for adjacent leash levels', () => {
    // excellent (1.0) vs good (0.7) → 1 - 0.3 = 0.7
    expect(calculateLeashScore('excellent', 'good')).toBeCloseTo(0.7);
  });
});

describe('LEASH_SCORES', () => {
  it('has values for all known leash behaviors', () => {
    expect(LEASH_SCORES['excellent']).toBe(1.0);
    expect(LEASH_SCORES['good']).toBe(0.7);
    expect(LEASH_SCORES['in_training']).toBe(0.4);
    expect(LEASH_SCORES['difficult']).toBe(0.1);
  });
});

describe('calculateWalkScore', () => {
  it('returns 1 for identical walk preferences', () => {
    const dog = buildDog({
      walkPrefTime: [WALK_TIME.MORNING],
      walkPrefDurationMin: 30,
      walkPrefDurationMax: 60,
      walkPrefTerrain: [WALK_TERRAIN.PARK],
    });
    expect(calculateWalkScore(dog, dog)).toBeCloseTo(1);
  });

  it('returns 0 for completely disjoint preferences', () => {
    const dogA = buildDog({
      walkPrefTime: [WALK_TIME.MORNING],
      walkPrefDurationMin: 10,
      walkPrefDurationMax: 20,
      walkPrefTerrain: [WALK_TERRAIN.PARK],
    });
    const dogB = buildDog({
      walkPrefTime: [WALK_TIME.EVENING],
      walkPrefDurationMin: 90,
      walkPrefDurationMax: 120,
      walkPrefTerrain: [WALK_TERRAIN.BEACH],
    });
    expect(calculateWalkScore(dogA, dogB)).toBe(0);
  });

  it('returns intermediate score for partial overlap', () => {
    const dogA = buildDog({
      walkPrefTime: [WALK_TIME.MORNING, WALK_TIME.AFTERNOON],
      walkPrefDurationMin: 30,
      walkPrefDurationMax: 60,
      walkPrefTerrain: [WALK_TERRAIN.PARK, WALK_TERRAIN.URBAN],
    });
    const dogB = buildDog({
      walkPrefTime: [WALK_TIME.AFTERNOON, WALK_TIME.EVENING],
      walkPrefDurationMin: 45,
      walkPrefDurationMax: 90,
      walkPrefTerrain: [WALK_TERRAIN.URBAN, WALK_TERRAIN.BEACH],
    });
    const score = calculateWalkScore(dogA, dogB);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('handles empty time arrays', () => {
    const dogA = buildDog({
      walkPrefTime: [],
      walkPrefDurationMin: 30,
      walkPrefDurationMax: 60,
      walkPrefTerrain: [WALK_TERRAIN.PARK],
    });
    const dogB = buildDog({
      walkPrefTime: [],
      walkPrefDurationMin: 30,
      walkPrefDurationMax: 60,
      walkPrefTerrain: [WALK_TERRAIN.PARK],
    });
    // time score = 0 (0/0 → 0), duration = 1, terrain = 1 → (0+1+1)/3
    const score = calculateWalkScore(dogA, dogB);
    expect(score).toBeCloseTo(2 / 3);
  });
});
