import { describe, expect, it } from 'vitest';
import { breedsData } from './breeds';

describe('Breeds seed data', () => {
  it('contains at least 200 breeds', () => {
    expect(breedsData.length).toBeGreaterThanOrEqual(200);
  });

  it('has no duplicate names', () => {
    const names = breedsData.map((b) => b.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('every breed has required fields', () => {
    for (const breed of breedsData) {
      expect(breed.name).toBeTruthy();
      expect(breed.nameIt).toBeTruthy();
    }
  });

  it('includes Mixed Breed entry', () => {
    const mixed = breedsData.find((b) => b.name === 'Mixed Breed');
    expect(mixed).toBeDefined();
    expect(mixed!.nameIt).toBe('Meticcio');
  });

  it('valid size categories for breeds with size', () => {
    const validSizes = ['toy', 'piccola', 'media', 'grande', 'gigante', null];
    for (const breed of breedsData) {
      expect(validSizes).toContain(breed.sizeCategory);
    }
  });

  it('covers all major FCI groups', () => {
    const groups = new Set(breedsData.map((b) => b.group).filter(Boolean));
    expect(groups.has('Sheepdogs')).toBe(true);
    expect(groups.has('Molossoid')).toBe(true);
    expect(groups.has('Terriers')).toBe(true);
    expect(groups.has('Spitz')).toBe(true);
    expect(groups.has('Scent Hounds')).toBe(true);
    expect(groups.has('Pointing Dogs')).toBe(true);
    expect(groups.has('Retrievers')).toBe(true);
    expect(groups.has('Companion')).toBe(true);
    expect(groups.has('Sighthounds')).toBe(true);
  });
});
