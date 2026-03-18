import { DEFAULT_WEIGHTS } from '@pawmeet/config';
import type { ScoreBreakdown } from '@pawmeet/types';

// ── Dimension metadata ──────────────────────────────────────────────────────

export type DimensionKey = 'size' | 'energy' | 'behavior' | 'walk' | 'distance' | 'leash';

const SCORE_KEY_MAP: Record<DimensionKey, keyof ScoreBreakdown> = {
  size: 'sizeScore',
  energy: 'energyScore',
  behavior: 'behaviorScore',
  walk: 'walkScore',
  distance: 'distanceScore',
  leash: 'leashScore',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the i18n tier suffix (tier1–tier4) based on score threshold. */
function getTierForScore(score: number): 'tier1' | 'tier2' | 'tier3' | 'tier4' {
  if (score >= 0.8) return 'tier1';
  if (score >= 0.6) return 'tier2';
  if (score >= 0.4) return 'tier3';
  return 'tier4';
}

/**
 * Returns the i18n key for a dimension name, e.g. `match.size.name`.
 */
export function getDimensionNameKey(key: DimensionKey): string {
  return `match.${key}.name`;
}

/**
 * Returns the i18n key for a score-based label, e.g. `match.size.tier1`.
 */
export function getDimensionLabelKey(key: DimensionKey, score: number): string {
  return `match.${key}.${getTierForScore(score)}`;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface ExplanationItem {
  key: DimensionKey;
  /** i18n key for dimension name, e.g. "match.size.name" */
  nameKey: string;
  score: number;
  /** i18n key for score label, e.g. "match.size.tier1" */
  labelKey: string;
}

/**
 * Converts a ScoreBreakdown into explanation items with i18n keys,
 * sorted by weighted score (best dimensions first).
 */
export function getExplanationItems(breakdown: ScoreBreakdown): ExplanationItem[] {
  const dimensions: DimensionKey[] = ['size', 'energy', 'behavior', 'walk', 'distance', 'leash'];

  return dimensions
    .map((key) => {
      const score = breakdown[SCORE_KEY_MAP[key]];
      return {
        key,
        nameKey: getDimensionNameKey(key),
        score,
        labelKey: getDimensionLabelKey(key, score),
      };
    })
    .sort((a, b) => {
      const weightedA = a.score * DEFAULT_WEIGHTS[a.key];
      const weightedB = b.score * DEFAULT_WEIGHTS[b.key];
      return weightedB - weightedA;
    });
}

/**
 * Returns only the i18n label keys of the top N dimensions (best first).
 */
export function getTopReasons(breakdown: ScoreBreakdown, count = 2): string[] {
  return getExplanationItems(breakdown)
    .slice(0, count)
    .map((item) => item.labelKey);
}
