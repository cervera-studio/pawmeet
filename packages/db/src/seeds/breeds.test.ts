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
    expect(mixed?.nameIt).toBe('Meticcio');
  });

  it('valid size categories for breeds with size', () => {
    const validSizes = ['toy', 'piccola', 'media', 'grande', 'gigante', null];
    for (const breed of breedsData) {
      expect(validSizes).toContain(breed.sizeCategory);
    }
  });

  it('behavioral scores are 1-5 or null', () => {
    const scoreFields = [
      'energy',
      'playfulness',
      'trainability',
      'barking',
      'goodWithOtherDogs',
      'goodWithChildren',
      'goodWithStrangers',
      'protectiveness',
      'shedding',
      'grooming',
    ] as const;

    for (const breed of breedsData) {
      for (const field of scoreFields) {
        const val = breed[field];
        if (val !== null) {
          expect(val, `${breed.name}.${field} = ${val}`).toBeGreaterThanOrEqual(1);
          expect(val, `${breed.name}.${field} = ${val}`).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('most breeds have behavioral scores', () => {
    const withScores = breedsData.filter((b) => b.energy !== null);
    // At least 75% should have scores
    expect(withScores.length).toBeGreaterThan(breedsData.length * 0.75);
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
