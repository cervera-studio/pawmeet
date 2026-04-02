import { DEFAULT_WEIGHTS } from '@pawmeet/config';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { validateMatchWeights } from './validate-match-weights.js';

describe('validateMatchWeights', () => {
  it('returns default weights when no input is provided', () => {
    const result = validateMatchWeights({});

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual(DEFAULT_WEIGHTS);
  });

  it('accepts valid custom weights that sum to 1.0', () => {
    const result = validateMatchWeights({
      matchWeightSize: 0.3,
      matchWeightEnergy: 0.2,
      matchWeightBehavior: 0.2,
      matchWeightWalk: 0.15,
      matchWeightDistance: 0.1,
      matchWeightLeash: 0.05,
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.size).toBe(0.3);
    expect(result.data.energy).toBe(0.2);
  });

  it('fills missing values with defaults', () => {
    const result = validateMatchWeights({
      matchWeightSize: DEFAULT_WEIGHTS.size,
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.energy).toBe(DEFAULT_WEIGHTS.energy);
    expect(result.data.behavior).toBe(DEFAULT_WEIGHTS.behavior);
  });

  it('fails when weights sum exceeds 1.0 beyond tolerance', () => {
    const result = validateMatchWeights({
      matchWeightSize: 0.5,
      matchWeightEnergy: 0.5,
      matchWeightBehavior: 0.2,
      matchWeightWalk: 0.15,
      matchWeightDistance: 0.1,
      matchWeightLeash: 0.05,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_WEIGHT_SUM');
    expect(result.error.status).toBe(400);
  });

  it('fails when weights sum is far below 1.0', () => {
    const result = validateMatchWeights({
      matchWeightSize: 0.1,
      matchWeightEnergy: 0.1,
      matchWeightBehavior: 0.1,
      matchWeightWalk: 0.1,
      matchWeightDistance: 0.1,
      matchWeightLeash: 0.05,
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('INVALID_WEIGHT_SUM');
    expect(result.error.status).toBe(400);
  });

  it('accepts weights within 0.01 tolerance', () => {
    const result = validateMatchWeights({
      matchWeightSize: 0.254,
      matchWeightEnergy: 0.25,
      matchWeightBehavior: 0.2,
      matchWeightWalk: 0.15,
      matchWeightDistance: 0.1,
      matchWeightLeash: 0.05,
    });

    expect(isSuccess(result)).toBe(true);
  });
});
