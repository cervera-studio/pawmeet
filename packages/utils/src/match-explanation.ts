import { DEFAULT_WEIGHTS } from '@pawmeet/config';
import type { ScoreBreakdown } from '@pawmeet/types';

// ── Dimension metadata ──────────────────────────────────────────────────────

type DimensionKey = 'size' | 'energy' | 'behavior' | 'walk' | 'distance' | 'leash';

const DIMENSION_NAMES: Record<DimensionKey, string> = {
  size: 'Taglia',
  energy: 'Energia',
  behavior: 'Intesa',
  walk: 'Orari e zone',
  distance: 'Distanza',
  leash: 'Guinzaglio',
};

const DIMENSION_LABELS: Record<DimensionKey, [string, string, string, string]> = {
  size: ['Taglia simile', 'Taglia compatibile', 'Taglia diversa', 'Taglia molto diversa'],
  energy: ['Stessa energia', 'Energia compatibile', 'Energia diversa', 'Energia molto diversa'],
  behavior: ['Ottima intesa', 'Buona intesa', 'Intesa discreta', 'Caratteri diversi'],
  walk: [
    'Stessi orari e zone',
    'Orari e zone simili',
    'Qualche orario in comune',
    'Orari e zone diversi',
  ],
  distance: ['Molto vicini', 'Vicini', 'Distanza media', "Un po' lontani"],
  leash: ['Stesso passo', 'Buon passo insieme', 'Guinzaglio discreto', 'Guinzaglio da gestire'],
};

const SCORE_KEY_MAP: Record<DimensionKey, keyof ScoreBreakdown> = {
  size: 'sizeScore',
  energy: 'energyScore',
  behavior: 'behaviorScore',
  walk: 'walkScore',
  distance: 'distanceScore',
  leash: 'leashScore',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getLabelForScore(key: DimensionKey, score: number): string {
  const labels = DIMENSION_LABELS[key];
  if (score >= 0.8) return labels[0];
  if (score >= 0.6) return labels[1];
  if (score >= 0.4) return labels[2];
  return labels[3];
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface ExplanationItem {
  key: DimensionKey;
  name: string;
  score: number;
  label: string;
}

/**
 * Converts a ScoreBreakdown into human-friendly explanation items,
 * sorted by weighted score (best dimensions first).
 */
export function getExplanationItems(breakdown: ScoreBreakdown): ExplanationItem[] {
  const dimensions: DimensionKey[] = ['size', 'energy', 'behavior', 'walk', 'distance', 'leash'];

  return dimensions
    .map((key) => {
      const score = breakdown[SCORE_KEY_MAP[key]];
      return {
        key,
        name: DIMENSION_NAMES[key],
        score,
        label: getLabelForScore(key, score),
      };
    })
    .sort((a, b) => {
      const weightedA = a.score * DEFAULT_WEIGHTS[a.key];
      const weightedB = b.score * DEFAULT_WEIGHTS[b.key];
      return weightedB - weightedA;
    });
}

/**
 * Returns only the labels of the top N dimensions (best first).
 */
export function getTopReasons(breakdown: ScoreBreakdown, count = 2): string[] {
  return getExplanationItems(breakdown)
    .slice(0, count)
    .map((item) => item.label);
}
