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

function findByKey(items: ReturnType<typeof getExplanationItems>, key: string) {
  const item = items.find((i) => i.key === key);
  expect(item).toBeDefined();
  return item as NonNullable<typeof item>;
}

describe('getExplanationItems', () => {
  it('returns 6 items for all dimensions', () => {
    const items = getExplanationItems(makeBreakdown());
    expect(items).toHaveLength(6);
  });

  it('sorts by weighted score descending', () => {
    const items = getExplanationItems(makeBreakdown({ sizeScore: 1.0, leashScore: 1.0 }));
    expect(items[0].key).toBe('size');
    const leashIndex = items.findIndex((i) => i.key === 'leash');
    expect(leashIndex).toBe(items.length - 1);
  });

  it('returns i18n keys, not hardcoded strings', () => {
    const items = getExplanationItems(makeBreakdown({ sizeScore: 0.9 }));
    const size = findByKey(items, 'size');
    expect(size.nameKey).toBe('match.size.name');
    expect(size.labelKey).toBe('match.size.tier1');
  });

  it('assigns tier1 for score ≥0.8', () => {
    const items = getExplanationItems(makeBreakdown({ sizeScore: 0.9 }));
    const size = findByKey(items, 'size');
    expect(size.labelKey).toBe('match.size.tier1');
  });

  it('assigns tier2 for score ≥0.6', () => {
    const items = getExplanationItems(makeBreakdown({ energyScore: 0.7 }));
    const energy = findByKey(items, 'energy');
    expect(energy.labelKey).toBe('match.energy.tier2');
  });

  it('assigns tier3 for score ≥0.4', () => {
    const items = getExplanationItems(makeBreakdown({ behaviorScore: 0.5 }));
    const behavior = findByKey(items, 'behavior');
    expect(behavior.labelKey).toBe('match.behavior.tier3');
  });

  it('assigns tier4 for score <0.4', () => {
    const items = getExplanationItems(makeBreakdown({ distanceScore: 0.2 }));
    const distance = findByKey(items, 'distance');
    expect(distance.labelKey).toBe('match.distance.tier4');
  });

  it('handles boundary at exactly 0.8', () => {
    const items = getExplanationItems(makeBreakdown({ walkScore: 0.8 }));
    const walk = findByKey(items, 'walk');
    expect(walk.labelKey).toBe('match.walk.tier1');
  });

  it('handles boundary at exactly 0.6', () => {
    const items = getExplanationItems(makeBreakdown({ leashScore: 0.6 }));
    const leash = findByKey(items, 'leash');
    expect(leash.labelKey).toBe('match.leash.tier2');
  });

  it('handles boundary at exactly 0.4', () => {
    const items = getExplanationItems(makeBreakdown({ sizeScore: 0.4 }));
    const size = findByKey(items, 'size');
    expect(size.labelKey).toBe('match.size.tier3');
  });
});

describe('getTopReasons', () => {
  it('returns top 2 label keys by default', () => {
    const reasons = getTopReasons(makeBreakdown({ sizeScore: 1.0, energyScore: 0.9 }));
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toBe('match.size.tier1');
    expect(reasons[1]).toBe('match.energy.tier1');
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
