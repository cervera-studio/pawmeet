// Compatibility matrices from MVP spec (doc 02)
import type { BehaviorWithDogs, DogSize, EnergyLevel } from '@pawmeet/types';

const SIZE_MATRIX: Record<DogSize, Record<DogSize, number>> = {
  toy: { toy: 1.0, piccola: 0.7, media: 0.3, grande: 0.1, gigante: 0.0 },
  piccola: { toy: 0.7, piccola: 1.0, media: 0.7, grande: 0.3, gigante: 0.1 },
  media: { toy: 0.3, piccola: 0.7, media: 1.0, grande: 0.7, gigante: 0.3 },
  grande: { toy: 0.1, piccola: 0.3, media: 0.7, grande: 1.0, gigante: 0.7 },
  gigante: { toy: 0.0, piccola: 0.1, media: 0.3, grande: 0.7, gigante: 1.0 },
};

const ENERGY_MATRIX: Record<EnergyLevel, Record<EnergyLevel, number>> = {
  bassa: { bassa: 1.0, media: 0.6, alta: 0.2, molto_alta: 0.0 },
  media: { bassa: 0.6, media: 1.0, alta: 0.7, molto_alta: 0.3 },
  alta: { bassa: 0.2, media: 0.7, alta: 1.0, molto_alta: 0.8 },
  molto_alta: { bassa: 0.0, media: 0.3, alta: 0.8, molto_alta: 1.0 },
};

const BEHAVIOR_MATRIX: Record<BehaviorWithDogs, Record<BehaviorWithDogs, number>> = {
  molto_socievole: { molto_socievole: 1.0, socievole: 0.9, selettivo: 0.5, reattivo: 0.2 },
  socievole: { molto_socievole: 0.9, socievole: 1.0, selettivo: 0.6, reattivo: 0.3 },
  selettivo: { molto_socievole: 0.5, socievole: 0.6, selettivo: 0.7, reattivo: 0.2 },
  reattivo: { molto_socievole: 0.2, socievole: 0.3, selettivo: 0.2, reattivo: 0.0 },
};

export function calculateSizeScore(a: DogSize, b: DogSize): number {
  return SIZE_MATRIX[a][b];
}

export function calculateEnergyScore(a: EnergyLevel, b: EnergyLevel): number {
  return ENERGY_MATRIX[a][b];
}

export function calculateBehaviorScore(a: BehaviorWithDogs, b: BehaviorWithDogs): number {
  return BEHAVIOR_MATRIX[a][b];
}

export function calculateDistanceScore(distanceKm: number): number {
  return Math.exp(-0.15 * distanceKm);
}
