import {
  BEHAVIOR_WITH_DOGS,
  BEHAVIOR_WITH_PEOPLE,
  DOG_SIZE,
  ENERGY_LEVEL,
  GENDER,
  LEASH_BEHAVIOR,
  RECALL_RELIABILITY,
  WALK_TERRAIN,
  WALK_TIME,
} from '@pawmeet/config';
import type { DogProfile } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { LocalEmbeddingService } from './embedding-service.js';

const service = new LocalEmbeddingService();

function buildDogProfile(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'owner-1',
    name: 'Buddy',
    birthDate: new Date('2022-01-15'),
    breed: 'Labrador',
    breedSecondary: null,
    size: DOG_SIZE.MEDIUM,
    weightKg: 25,
    gender: GENDER.MALE,
    isNeutered: true,
    energyLevel: ENERGY_LEVEL.HIGH,
    behaviorWithDogs: BEHAVIOR_WITH_DOGS.FRIENDLY,
    behaviorWithPeople: BEHAVIOR_WITH_PEOPLE.FRIENDLY,
    leashBehavior: LEASH_BEHAVIOR.GOOD,
    recallReliability: RECALL_RELIABILITY.PARTIAL,
    bio: null,
    walkPrefTime: [WALK_TIME.MORNING, WALK_TIME.EVENING],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 90,
    walkPrefTerrain: [WALK_TERRAIN.PARK, WALK_TERRAIN.URBAN],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies DogProfile;
}

describe('LocalEmbeddingService', () => {
  it('has modelVersion "local-v1"', () => {
    expect(service.modelVersion).toBe('local-v1');
  });

  describe('encode', () => {
    it('returns a 768-dimensional vector', () => {
      const embedding = service.encode(buildDogProfile());
      expect(embedding).toHaveLength(768);
    });

    it('returns only numbers between 0 and 1 inclusive', () => {
      const embedding = service.encode(buildDogProfile());
      for (const val of embedding) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('is deterministic for the same input', () => {
      const dog = buildDogProfile();
      const a = service.encode(dog);
      const b = service.encode(dog);
      expect(a).toEqual(b);
    });

    it('produces different embeddings for different sizes', () => {
      const small = service.encode(buildDogProfile({ size: DOG_SIZE.SMALL }));
      const giant = service.encode(buildDogProfile({ size: DOG_SIZE.GIANT }));
      expect(small).not.toEqual(giant);
      // Size is one-hot in dims 0..4: SMALL -> index 1, GIANT -> index 4
      expect(small[1]).toBe(1);
      expect(small[4]).toBe(0);
      expect(giant[4]).toBe(1);
      expect(giant[1]).toBe(0);
    });

    it('encodes energy level as one-hot in dims 5..8', () => {
      const low = service.encode(buildDogProfile({ energyLevel: ENERGY_LEVEL.LOW }));
      const veryHigh = service.encode(buildDogProfile({ energyLevel: ENERGY_LEVEL.VERY_HIGH }));
      // LOW -> index 0 in energy (dim 5), VERY_HIGH -> index 3 (dim 8)
      expect(low[5]).toBe(1);
      expect(low[8]).toBe(0);
      expect(veryHigh[8]).toBe(1);
      expect(veryHigh[5]).toBe(0);
    });

    it('encodes gender as one-hot in dims 21..22', () => {
      const male = service.encode(buildDogProfile({ gender: GENDER.MALE }));
      const female = service.encode(buildDogProfile({ gender: GENDER.FEMALE }));
      // Gender starts at dim 21 (5+4+4+4+4=21)
      expect(male[21]).toBe(1);
      expect(male[22]).toBe(0);
      expect(female[21]).toBe(0);
      expect(female[22]).toBe(1);
    });

    it('encodes isNeutered as 1 at dim 26', () => {
      const neutered = service.encode(buildDogProfile({ isNeutered: true }));
      const intact = service.encode(buildDogProfile({ isNeutered: false }));
      // isNeutered at dim 26 (5+4+4+4+4+2+3=26)
      expect(neutered[26]).toBe(1);
      expect(intact[26]).toBe(0);
    });

    it('normalizes weightKg between 0.5 and 100', () => {
      const light = service.encode(buildDogProfile({ weightKg: 0.5 }));
      const heavy = service.encode(buildDogProfile({ weightKg: 100 }));
      // dim 27 is normalized weight (5+4+4+4+4+2+3+1=27)
      expect(light[27]).toBeCloseTo(0, 5);
      expect(heavy[27]).toBeCloseTo(1, 5);
    });

    it('encodes walk time preferences as multi-hot', () => {
      const dog = buildDogProfile({
        walkPrefTime: [WALK_TIME.MORNING, WALK_TIME.EVENING],
      });
      const embedding = service.encode(dog);
      // Walk time multi-hot starts at dim 30 (27+1+2=30)
      // TIME_SLOTS: MORNING=0, AFTERNOON=1, EVENING=2, LATE_EVENING=3
      expect(embedding[30]).toBe(1); // MORNING
      expect(embedding[31]).toBe(0); // AFTERNOON
      expect(embedding[32]).toBe(1); // EVENING
      expect(embedding[33]).toBe(0); // LATE_EVENING
    });

    it('pads remaining dimensions with zeros', () => {
      const embedding = service.encode(buildDogProfile());
      // Total structured features: 5+4+4+4+4+2+3+1+1+2+4+5+1 = 40
      const tail = embedding.slice(40);
      expect(tail.every((v) => v === 0)).toBe(true);
    });

    it('encodes null recallReliability with default index 1', () => {
      const withNull = service.encode(buildDogProfile({ recallReliability: null }));
      const withPartial = service.encode(
        buildDogProfile({ recallReliability: RECALL_RELIABILITY.PARTIAL }),
      );
      // Both should produce the same recall encoding (PARTIAL = index 1 = default)
      // Recall dims: 23, 24, 25 (5+4+4+4+4+2=23)
      expect(withNull[23]).toBe(withPartial[23]);
      expect(withNull[24]).toBe(withPartial[24]);
      expect(withNull[25]).toBe(withPartial[25]);
    });
  });

  describe('cosine similarity (manual)', () => {
    function cosineSimilarity(a: number[], b: number[]): number {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < a.length; i++) {
        dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
        normA += (a[i] ?? 0) ** 2;
        normB += (b[i] ?? 0) ** 2;
      }
      const denominator = Math.sqrt(normA) * Math.sqrt(normB);
      return denominator === 0 ? 0 : dotProduct / denominator;
    }

    it('identical dogs have cosine similarity of 1', () => {
      const dog = buildDogProfile();
      const embedding = service.encode(dog);
      expect(cosineSimilarity(embedding, embedding)).toBeCloseTo(1, 5);
    });

    it('similar dogs have higher cosine similarity than dissimilar dogs', () => {
      const base = buildDogProfile();
      const similar = buildDogProfile({ size: DOG_SIZE.LARGE });
      const dissimilar = buildDogProfile({
        size: DOG_SIZE.TOY,
        energyLevel: ENERGY_LEVEL.LOW,
        behaviorWithDogs: BEHAVIOR_WITH_DOGS.REACTIVE,
        gender: GENDER.FEMALE,
        isNeutered: false,
        weightKg: 2,
      });

      const baseEmb = service.encode(base);
      const similarEmb = service.encode(similar);
      const dissimilarEmb = service.encode(dissimilar);

      const simScore = cosineSimilarity(baseEmb, similarEmb);
      const dissimScore = cosineSimilarity(baseEmb, dissimilarEmb);
      expect(simScore).toBeGreaterThan(dissimScore);
    });
  });
});
