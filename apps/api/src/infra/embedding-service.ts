import type { DogProfile } from '@pawmeet/types';
import type { EmbeddingService } from '../ports/embedding-service.js';

const EMBEDDING_DIM = 768;

const MODEL_VERSION = 'local-v1';

// ── Categorical mappings ────────────────────────────────────────────────────

const SIZE_MAP = { toy: 0, small: 1, medium: 2, large: 3, giant: 4 } as const;
const ENERGY_MAP = { low: 0, medium: 1, high: 2, very_high: 3 } as const;
const BEHAVIOR_DOG_MAP = { very_friendly: 0, friendly: 1, selective: 2, reactive: 3 } as const;
const BEHAVIOR_PEOPLE_MAP = {
  very_friendly: 0,
  friendly: 1,
  shy: 2,
  wary: 3,
} as const;
const LEASH_MAP = { excellent: 0, good: 1, in_training: 2, difficult: 3 } as const;
const GENDER_MAP = { male: 0, female: 1 } as const;
const RECALL_MAP = { reliable: 0, partial: 1, unreliable: 2 } as const;

const TIME_SLOTS = ['morning', 'afternoon', 'evening', 'late_evening'] as const;
const TERRAINS = ['urban', 'park', 'countryside', 'beach', 'mountain'] as const;

// ── One-hot encoding helpers ────────────────────────────────────────────────

function oneHot(index: number, size: number): number[] {
  const vec = new Array<number>(size).fill(0);
  if (index >= 0 && index < size) vec[index] = 1;
  return vec;
}

function multiHot(values: string[], categories: readonly string[]): number[] {
  return categories.map((cat) => (values.includes(cat) ? 1 : 0));
}

function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

// ── Embedding service ───────────────────────────────────────────────────────

export class LocalEmbeddingService implements EmbeddingService {
  readonly modelVersion = MODEL_VERSION;

  /**
   * Generates a deterministic 768-dim embedding from structured dog attributes.
   * Uses one-hot encoding for categoricals + normalized numerics, padded to 768.
   */
  encode(dog: DogProfile): number[] {
    const features: number[] = [];

    // Size (5 dims)
    features.push(...oneHot(SIZE_MAP[dog.size as keyof typeof SIZE_MAP] ?? 2, 5));

    // Energy level (4 dims)
    features.push(...oneHot(ENERGY_MAP[dog.energyLevel as keyof typeof ENERGY_MAP] ?? 1, 4));

    // Behavior with dogs (4 dims)
    features.push(
      ...oneHot(BEHAVIOR_DOG_MAP[dog.behaviorWithDogs as keyof typeof BEHAVIOR_DOG_MAP] ?? 1, 4),
    );

    // Behavior with people (4 dims)
    features.push(
      ...oneHot(
        BEHAVIOR_PEOPLE_MAP[dog.behaviorWithPeople as keyof typeof BEHAVIOR_PEOPLE_MAP] ?? 1,
        4,
      ),
    );

    // Leash behavior (4 dims)
    features.push(...oneHot(LEASH_MAP[dog.leashBehavior as keyof typeof LEASH_MAP] ?? 1, 4));

    // Gender (2 dims)
    features.push(...oneHot(GENDER_MAP[dog.gender as keyof typeof GENDER_MAP] ?? 0, 2));

    // Recall reliability (3 dims)
    const recallIdx = dog.recallReliability
      ? (RECALL_MAP[dog.recallReliability as keyof typeof RECALL_MAP] ?? 1)
      : 1;
    features.push(...oneHot(recallIdx, 3));

    // Neutered (1 dim)
    features.push(dog.isNeutered ? 1 : 0);

    // Weight normalized (1 dim) — range 0.5 to 100 kg
    features.push(normalize(dog.weightKg, 0.5, 100));

    // Walk duration min/max normalized (2 dims) — range 15 to 180 min
    features.push(normalize(dog.walkPrefDurationMin, 15, 180));
    features.push(normalize(dog.walkPrefDurationMax, 15, 180));

    // Walk time preferences multi-hot (4 dims)
    features.push(...multiHot(dog.walkPrefTime, TIME_SLOTS));

    // Terrain preferences multi-hot (6 dims)
    features.push(...multiHot(dog.walkPrefTerrain, TERRAINS));

    // Age normalized (1 dim) — range 0 to 20 years
    const ageYears = (Date.now() - new Date(dog.birthDate).getTime()) / (365.25 * 86_400_000);
    features.push(normalize(Math.min(ageYears, 20), 0, 20));

    // Total structured features: 5+4+4+4+4+2+3+1+1+2+4+6+1 = 41 dims
    // Pad remaining with zeros to reach 768
    const padded = new Array<number>(EMBEDDING_DIM).fill(0);
    for (let i = 0; i < features.length; i++) {
      padded[i] = features[i] ?? 0;
    }

    return padded;
  }
}
