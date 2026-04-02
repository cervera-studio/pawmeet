import { describe, expect, it } from 'vitest';
import { hasLocation, hasOwnerLocation } from './type-guards.js';

describe('hasLocation', () => {
  it('returns true when both latitude and longitude are present', () => {
    const entity = { latitude: 41.9, longitude: 12.5 };
    expect(hasLocation(entity)).toBe(true);
  });

  it('returns false when latitude is null', () => {
    const entity = { latitude: null, longitude: 12.5 };
    expect(hasLocation(entity)).toBe(false);
  });

  it('returns false when longitude is null', () => {
    const entity = { latitude: 41.9, longitude: null };
    expect(hasLocation(entity)).toBe(false);
  });

  it('returns false when both are null', () => {
    const entity = { latitude: null, longitude: null };
    expect(hasLocation(entity)).toBe(false);
  });

  it('narrows type so latitude/longitude are non-null', () => {
    const entity = {
      latitude: 41.9 as number | null,
      longitude: 12.5 as number | null,
      name: 'test',
    };
    if (hasLocation(entity)) {
      // TypeScript should allow accessing .latitude as number (not number | null)
      const lat: number = entity.latitude;
      const lon: number = entity.longitude;
      expect(lat).toBe(41.9);
      expect(lon).toBe(12.5);
    }
  });
});

describe('hasOwnerLocation', () => {
  it('returns true when both ownerLat and ownerLon are present', () => {
    const entity = { ownerLat: 41.9, ownerLon: 12.5 };
    expect(hasOwnerLocation(entity)).toBe(true);
  });

  it('returns false when ownerLat is null', () => {
    const entity = { ownerLat: null, ownerLon: 12.5 };
    expect(hasOwnerLocation(entity)).toBe(false);
  });

  it('returns false when ownerLon is null', () => {
    const entity = { ownerLat: 41.9, ownerLon: null };
    expect(hasOwnerLocation(entity)).toBe(false);
  });

  it('returns false when both are null', () => {
    const entity = { ownerLat: null, ownerLon: null };
    expect(hasOwnerLocation(entity)).toBe(false);
  });
});
