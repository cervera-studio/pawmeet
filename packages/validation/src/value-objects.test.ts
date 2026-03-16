import { describe, expect, it } from 'vitest';
import {
  parseCompatibilityScore,
  parseCoordinates,
  parseEmail,
  parseMatchWeights,
  safeParseCoordinates,
  safeParseEmail,
  safeParseMatchWeights,
} from './value-objects';

describe('Email', () => {
  it('normalizes to lowercase', () => {
    const email = parseEmail('Mario@Example.COM');
    expect(email).toBe('mario@example.com');
  });

  it('rejects invalid email', () => {
    const result = safeParseEmail('not-an-email');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = safeParseEmail('');
    expect(result.success).toBe(false);
  });
});

describe('Coordinates', () => {
  it('parses valid coordinates', () => {
    const coords = parseCoordinates(41.9028, 12.4964);
    expect(coords.latitude).toBe(41.9028);
    expect(coords.longitude).toBe(12.4964);
  });

  it('accepts boundary values', () => {
    expect(safeParseCoordinates(90, 180).success).toBe(true);
    expect(safeParseCoordinates(-90, -180).success).toBe(true);
  });

  it('rejects latitude out of range', () => {
    expect(safeParseCoordinates(91, 0).success).toBe(false);
    expect(safeParseCoordinates(-91, 0).success).toBe(false);
  });

  it('rejects longitude out of range', () => {
    expect(safeParseCoordinates(0, 181).success).toBe(false);
    expect(safeParseCoordinates(0, -181).success).toBe(false);
  });
});

describe('CompatibilityScore', () => {
  it('accepts valid scores', () => {
    expect(parseCompatibilityScore(0)).toBe(0);
    expect(parseCompatibilityScore(0.85)).toBe(0.85);
    expect(parseCompatibilityScore(1)).toBe(1);
  });

  it('rejects values below 0', () => {
    expect(() => parseCompatibilityScore(-0.1)).toThrow();
  });

  it('rejects values above 1', () => {
    expect(() => parseCompatibilityScore(1.1)).toThrow();
  });
});

describe('MatchWeights', () => {
  const validWeights = {
    size: 0.25,
    energy: 0.25,
    behavior: 0.2,
    walk: 0.15,
    distance: 0.1,
    leash: 0.05,
  };

  it('accepts valid weights that sum to 1', () => {
    const weights = parseMatchWeights(validWeights);
    expect(weights.size).toBe(0.25);
    expect(weights.leash).toBe(0.05);
  });

  it('rejects weights that do not sum to 1', () => {
    const result = safeParseMatchWeights({ ...validWeights, size: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects negative weights', () => {
    const result = safeParseMatchWeights({ ...validWeights, size: -0.1, energy: 0.6 });
    expect(result.success).toBe(false);
  });

  it('tolerates floating-point imprecision', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    const weights = {
      size: 0.1,
      energy: 0.2,
      behavior: 0.3,
      walk: 0.15,
      distance: 0.15,
      leash: 0.1,
    };
    const result = safeParseMatchWeights(weights);
    expect(result.success).toBe(true);
  });
});
