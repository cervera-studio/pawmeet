import { parseMatchWeights } from '@pawmeet/validation';
import { describe, expect, it } from 'vitest';
import { buildDog } from '../test-utils/builders.js';
import { createMatchingAlgorithm } from './matching-algorithm.js';

const DEFAULT_WEIGHTS = parseMatchWeights({
  size: 0.25,
  energy: 0.25,
  behavior: 0.2,
  walk: 0.15,
  distance: 0.1,
  leash: 0.05,
});

describe('MatchingAlgorithm', () => {
  const algorithm = createMatchingAlgorithm();

  it('returns perfect score for identical dogs at zero distance', () => {
    const dog = buildDog({
      size: 'grande',
      energyLevel: 'alta',
      behaviorWithDogs: 'socievole',
      leashBehavior: 'buono',
      walkPrefTime: ['mattina'],
      walkPrefDurationMin: 30,
      walkPrefDurationMax: 60,
      walkPrefTerrain: ['parco'],
    });

    const result = algorithm.calculate(dog, dog, 0, DEFAULT_WEIGHTS);

    expect(result.size).toBe(1.0);
    expect(result.energy).toBe(1.0);
    expect(result.behavior).toBe(1.0);
    expect(result.walk).toBe(1.0);
    expect(result.distance).toBe(1.0);
    expect(result.leash).toBe(1.0);
    expect(result.overall).toBeCloseTo(1.0, 2);
  });

  it('returns lower score for mismatched sizes', () => {
    const dogA = buildDog({ size: 'toy' });
    const dogB = buildDog({ size: 'gigante' });

    const result = algorithm.calculate(dogA, dogB, 0, DEFAULT_WEIGHTS);

    expect(result.size).toBe(0.0);
    expect(result.overall).toBeLessThan(1.0);
  });

  it('distance decay reduces score for far away dogs', () => {
    const dog = buildDog();

    const nearby = algorithm.calculate(dog, dog, 1, DEFAULT_WEIGHTS);
    const farAway = algorithm.calculate(dog, dog, 30, DEFAULT_WEIGHTS);

    expect(nearby.distance).toBeGreaterThan(farAway.distance);
    expect(nearby.overall).toBeGreaterThan(farAway.overall);
  });

  it('returns all breakdown components', () => {
    const dogA = buildDog();
    const dogB = buildDog({ id: 'dog-2', ownerId: 'user-2' });

    const result = algorithm.calculate(dogA, dogB, 5, DEFAULT_WEIGHTS);

    expect(result).toHaveProperty('size');
    expect(result).toHaveProperty('energy');
    expect(result).toHaveProperty('behavior');
    expect(result).toHaveProperty('walk');
    expect(result).toHaveProperty('distance');
    expect(result).toHaveProperty('leash');
    expect(result).toHaveProperty('overall');
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });

  it('respects custom weights', () => {
    const dogA = buildDog({ size: 'toy' });
    const dogB = buildDog({ size: 'gigante' });

    // Size weight = 0 should ignore size mismatch
    const zeroSizeWeights = parseMatchWeights({
      size: 0,
      energy: 0.3,
      behavior: 0.3,
      walk: 0.2,
      distance: 0.15,
      leash: 0.05,
    });

    const withSize = algorithm.calculate(dogA, dogB, 0, DEFAULT_WEIGHTS);
    const withoutSize = algorithm.calculate(dogA, dogB, 0, zeroSizeWeights);

    expect(withoutSize.overall).toBeGreaterThan(withSize.overall);
  });
});
