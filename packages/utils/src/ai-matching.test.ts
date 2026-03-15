import { describe, expect, it } from 'vitest';
import type { UserMatchingPreferences } from '@pawmeet/types';
import {
  type MatchingWeights,
  blendWeights,
  calculateWeightedScore,
  normalizeWeights,
} from './ai-matching';

// ── Builders ────────────────────────────────────────────────────────────────

function buildWeights(overrides: Partial<MatchingWeights> = {}): MatchingWeights {
  return {
    size: 0.25,
    energy: 0.25,
    behavior: 0.2,
    walk: 0.15,
    distance: 0.1,
    leash: 0.05,
    ...overrides,
  };
}

function buildUserPrefs(
  overrides: Partial<UserMatchingPreferences> = {},
): UserMatchingPreferences {
  return {
    id: 'pref-1',
    userId: 'user-1',
    weightSize: 0.3,
    weightEnergy: 0.3,
    weightBehavior: 0.15,
    weightWalk: 0.1,
    weightDistance: 0.1,
    weightLeash: 0.05,
    sampleSize: 30,
    successRate: 0.6,
    updatedAt: new Date(),
    ...overrides,
  };
}

function sumWeights(w: MatchingWeights): number {
  return w.size + w.energy + w.behavior + w.walk + w.distance + w.leash;
}

// ── normalizeWeights ────────────────────────────────────────────────────────

describe('normalizeWeights', () => {
  it('normalizes weights so they sum to 1.0', () => {
    const input = buildWeights({ size: 2, energy: 2, behavior: 2, walk: 2, distance: 1, leash: 1 });
    const result = normalizeWeights(input);

    expect(sumWeights(result)).toBeCloseTo(1.0);
    expect(result.size).toBeCloseTo(0.2);
    expect(result.leash).toBeCloseTo(0.1);
  });

  it('returns defaults when all weights are zero', () => {
    const allZero = buildWeights({
      size: 0,
      energy: 0,
      behavior: 0,
      walk: 0,
      distance: 0,
      leash: 0,
    });
    const result = normalizeWeights(allZero);

    expect(sumWeights(result)).toBeCloseTo(1.0);
    // Should return the default weights
    expect(result.size).toBeCloseTo(0.25);
    expect(result.energy).toBeCloseTo(0.25);
    expect(result.behavior).toBeCloseTo(0.2);
    expect(result.walk).toBeCloseTo(0.15);
    expect(result.distance).toBeCloseTo(0.1);
    expect(result.leash).toBeCloseTo(0.05);
  });

  it('returns same proportions when already normalized', () => {
    const normalized = buildWeights(); // defaults already sum to 1.0
    const result = normalizeWeights(normalized);

    expect(result.size).toBeCloseTo(0.25);
    expect(result.energy).toBeCloseTo(0.25);
    expect(result.behavior).toBeCloseTo(0.2);
    expect(result.walk).toBeCloseTo(0.15);
    expect(result.distance).toBeCloseTo(0.1);
    expect(result.leash).toBeCloseTo(0.05);
  });

  it('handles weights that sum to less than 1.0', () => {
    const input = buildWeights({
      size: 0.1,
      energy: 0.1,
      behavior: 0.1,
      walk: 0.1,
      distance: 0.05,
      leash: 0.05,
    });
    const result = normalizeWeights(input);

    expect(sumWeights(result)).toBeCloseTo(1.0);
    // Equal weights should remain equal after normalization
    expect(result.size).toBeCloseTo(result.energy);
  });

  it('handles weights that sum to more than 1.0', () => {
    const input = buildWeights({
      size: 5,
      energy: 5,
      behavior: 5,
      walk: 5,
      distance: 5,
      leash: 5,
    });
    const result = normalizeWeights(input);

    expect(sumWeights(result)).toBeCloseTo(1.0);
    // All equal inputs produce equal outputs
    const expected = 1 / 6;
    expect(result.size).toBeCloseTo(expected);
    expect(result.leash).toBeCloseTo(expected);
  });
});

// ── blendWeights ────────────────────────────────────────────────────────────

describe('blendWeights', () => {
  it('returns defaults when userPrefs is null', () => {
    const result = blendWeights(null);

    expect(result.size).toBeCloseTo(0.25);
    expect(result.energy).toBeCloseTo(0.25);
    expect(result.behavior).toBeCloseTo(0.2);
    expect(sumWeights(result)).toBeCloseTo(1.0);
  });

  it('returns defaults when sample size is below minSwipes threshold', () => {
    const prefs = buildUserPrefs({ sampleSize: 5 });
    const result = blendWeights(prefs, 15);

    expect(result.size).toBeCloseTo(0.25);
    expect(result.energy).toBeCloseTo(0.25);
  });

  it('blends learned weights when sample size exceeds threshold', () => {
    const prefs = buildUserPrefs({
      sampleSize: 50,
      weightSize: 0.5,
      weightEnergy: 0.1,
      weightBehavior: 0.1,
      weightWalk: 0.1,
      weightDistance: 0.1,
      weightLeash: 0.1,
    });
    const result = blendWeights(prefs, 15, 0.6);

    expect(sumWeights(result)).toBeCloseTo(1.0);
    // With maxBlend=0.6 and full confidence (50 swipes), size should shift toward 0.5
    expect(result.size).toBeGreaterThan(0.25);
    // Energy should shift toward 0.1 (lower than default 0.25)
    expect(result.energy).toBeLessThan(0.25);
  });

  it('scales blend by confidence (sample size / 50)', () => {
    const prefsLow = buildUserPrefs({ sampleSize: 25 }); // confidence = 0.5
    const prefsHigh = buildUserPrefs({ sampleSize: 50 }); // confidence = 1.0

    const resultLow = blendWeights(prefsLow);
    const resultHigh = blendWeights(prefsHigh);

    // Both should be normalized
    expect(sumWeights(resultLow)).toBeCloseTo(1.0);
    expect(sumWeights(resultHigh)).toBeCloseTo(1.0);

    // Higher confidence should deviate more from defaults
    const defaultSize = 0.25;
    const deviationLow = Math.abs(resultLow.size - defaultSize);
    const deviationHigh = Math.abs(resultHigh.size - defaultSize);
    expect(deviationHigh).toBeGreaterThan(deviationLow);
  });

  it('caps confidence at 1.0 even with very large sample sizes', () => {
    const prefs50 = buildUserPrefs({ sampleSize: 50 });
    const prefs200 = buildUserPrefs({ sampleSize: 200 });

    const result50 = blendWeights(prefs50);
    const result200 = blendWeights(prefs200);

    // Should produce identical results since confidence caps at 1.0
    expect(result50.size).toBeCloseTo(result200.size);
    expect(result50.energy).toBeCloseTo(result200.energy);
  });

  it('respects custom minSwipes threshold', () => {
    const prefs = buildUserPrefs({ sampleSize: 10 });

    // Default threshold (15) — should return defaults
    const withDefault = blendWeights(prefs);
    expect(withDefault.size).toBeCloseTo(0.25);

    // Lower threshold (5) — should blend
    const withLower = blendWeights(prefs, 5);
    expect(sumWeights(withLower)).toBeCloseTo(1.0);
  });
});

// ── calculateWeightedScore ──────────────────────────────────────────────────

describe('calculateWeightedScore', () => {
  it('computes basic weighted sum', () => {
    const scores = {
      sizeScore: 1.0,
      energyScore: 0.8,
      behaviorScore: 0.6,
      walkScore: 0.4,
      distanceScore: 0.2,
      leashScore: 0.0,
    };
    const weights = buildWeights();

    const result = calculateWeightedScore(scores, weights);

    const expected =
      0.25 * 1.0 + 0.25 * 0.8 + 0.2 * 0.6 + 0.15 * 0.4 + 0.1 * 0.2 + 0.05 * 0.0;
    expect(result).toBeCloseTo(expected);
  });

  it('returns 0.0 when all scores are zero', () => {
    const scores = {
      sizeScore: 0,
      energyScore: 0,
      behaviorScore: 0,
      walkScore: 0,
      distanceScore: 0,
      leashScore: 0,
    };
    const result = calculateWeightedScore(scores, buildWeights());

    expect(result).toBe(0);
  });

  it('returns 1.0 when all scores are 1.0 and weights are normalized', () => {
    const scores = {
      sizeScore: 1.0,
      energyScore: 1.0,
      behaviorScore: 1.0,
      walkScore: 1.0,
      distanceScore: 1.0,
      leashScore: 1.0,
    };
    const result = calculateWeightedScore(scores, buildWeights());

    expect(result).toBeCloseTo(1.0);
  });

  it('uses custom weights correctly', () => {
    const scores = {
      sizeScore: 1.0,
      energyScore: 0.0,
      behaviorScore: 0.0,
      walkScore: 0.0,
      distanceScore: 0.0,
      leashScore: 0.0,
    };
    const weights = buildWeights({ size: 0.8, energy: 0.04, behavior: 0.04, walk: 0.04, distance: 0.04, leash: 0.04 });

    const result = calculateWeightedScore(scores, weights);

    // Only sizeScore contributes: 0.8 * 1.0 = 0.8
    expect(result).toBeCloseTo(0.8);
  });

  it('produces higher score when high-weight dimensions score well', () => {
    const weights = buildWeights(); // size=0.25, energy=0.25 are the heaviest

    const highOnHeavy = {
      sizeScore: 1.0,
      energyScore: 1.0,
      behaviorScore: 0.0,
      walkScore: 0.0,
      distanceScore: 0.0,
      leashScore: 0.0,
    };

    const highOnLight = {
      sizeScore: 0.0,
      energyScore: 0.0,
      behaviorScore: 0.0,
      walkScore: 0.0,
      distanceScore: 1.0,
      leashScore: 1.0,
    };

    expect(calculateWeightedScore(highOnHeavy, weights)).toBeGreaterThan(
      calculateWeightedScore(highOnLight, weights),
    );
  });
});
