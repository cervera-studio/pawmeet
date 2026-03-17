import type { ScoreBreakdown } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { getExplanationItems, getTopReasons } from './match-explanation';

const makeBreakdown = (overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown => ({
  sizeScore: 0.5,
  energyScore: 0.5,
  behaviorScore: 0.5,
  walkScore: 0.5,
  distanceScore: 0.5,
  leashScore: 0.5,
  overallScore: 0.5,
  ...overrides,
});

describe('getExplanationItems', () => {
  it('returns 6 items for all dimensions', () => {
    const items = getExplanationItems(makeBreakdown());
    expect(items).toHaveLength(6);
  });

  it('sorts by weighted score descending', () => {
    // size weight=0.25 with score 1.0 → weighted 0.25 (highest)
    // leash weight=0.05 with score 1.0 → weighted 0.05 (lowest among perfect)
    const items = getExplanationItems(makeBreakdown({ sizeScore: 1.0, leashScore: 1.0 }));
    expect(items[0].key).toBe('size');
    // leash should be last among equal-raw-score dimensions (lower weight)
    const leashIndex = items.findIndex((i) => i.key === 'leash');
    expect(leashIndex).toBe(items.length - 1);
  });

  it('assigns correct label tier ≥0.8', () => {
    const items = getExplanationItems(makeBreakdown({ sizeScore: 0.9 }));
    const size = items.find((i) => i.key === 'size')!;
    expect(size.label).toBe('Taglia simile');
  });

  it('assigns correct label tier ≥0.6', () => {
    const items = getExplanationItems(makeBreakdown({ energyScore: 0.7 }));
    const energy = items.find((i) => i.key === 'energy')!;
    expect(energy.label).toBe('Energia compatibile');
  });

  it('assigns correct label tier ≥0.4', () => {
    const items = getExplanationItems(makeBreakdown({ behaviorScore: 0.5 }));
    const behavior = items.find((i) => i.key === 'behavior')!;
    expect(behavior.label).toBe('Intesa discreta');
  });

  it('assigns correct label tier <0.4', () => {
    const items = getExplanationItems(makeBreakdown({ distanceScore: 0.2 }));
    const distance = items.find((i) => i.key === 'distance')!;
    expect(distance.label).toBe("Un po' lontani");
  });

  it('handles boundary at exactly 0.8', () => {
    const items = getExplanationItems(makeBreakdown({ walkScore: 0.8 }));
    const walk = items.find((i) => i.key === 'walk')!;
    expect(walk.label).toBe('Stessi orari e zone');
  });

  it('handles boundary at exactly 0.6', () => {
    const items = getExplanationItems(makeBreakdown({ leashScore: 0.6 }));
    const leash = items.find((i) => i.key === 'leash')!;
    expect(leash.label).toBe('Buon passo insieme');
  });

  it('handles boundary at exactly 0.4', () => {
    const items = getExplanationItems(makeBreakdown({ sizeScore: 0.4 }));
    const size = items.find((i) => i.key === 'size')!;
    expect(size.label).toBe('Taglia diversa'); // 0.4 is ≥0.4, third tier
  });
});

describe('getTopReasons', () => {
  it('returns top 2 labels by default', () => {
    const reasons = getTopReasons(makeBreakdown({ sizeScore: 1.0, energyScore: 0.9 }));
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toBe('Taglia simile');
    expect(reasons[1]).toBe('Stessa energia');
  });

  it('respects custom count', () => {
    const reasons = getTopReasons(makeBreakdown(), 3);
    expect(reasons).toHaveLength(3);
  });

  it('returns all if count exceeds dimensions', () => {
    const reasons = getTopReasons(makeBreakdown(), 10);
    expect(reasons).toHaveLength(6);
  });
});
