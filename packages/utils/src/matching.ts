// Compatibility matrices from MVP spec (doc 02)
import type { BehaviorWithDogs, DogSize, EnergyLevel } from '@pawmeet/types';

const SIZE_MATRIX: Record<DogSize, Record<DogSize, number>> = {
  toy: { toy: 1.0, small: 0.7, medium: 0.3, large: 0.1, giant: 0.0 },
  small: { toy: 0.7, small: 1.0, medium: 0.7, large: 0.3, giant: 0.1 },
  medium: { toy: 0.3, small: 0.7, medium: 1.0, large: 0.7, giant: 0.3 },
  large: { toy: 0.1, small: 0.3, medium: 0.7, large: 1.0, giant: 0.7 },
  giant: { toy: 0.0, small: 0.1, medium: 0.3, large: 0.7, giant: 1.0 },
};

const ENERGY_MATRIX: Record<EnergyLevel, Record<EnergyLevel, number>> = {
  low: { low: 1.0, medium: 0.6, high: 0.2, very_high: 0.0 },
  medium: { low: 0.6, medium: 1.0, high: 0.7, very_high: 0.3 },
  high: { low: 0.2, medium: 0.7, high: 1.0, very_high: 0.8 },
  very_high: { low: 0.0, medium: 0.3, high: 0.8, very_high: 1.0 },
};

const BEHAVIOR_MATRIX: Record<BehaviorWithDogs, Record<BehaviorWithDogs, number>> = {
  very_friendly: { very_friendly: 1.0, friendly: 0.9, selective: 0.5, reactive: 0.2 },
  friendly: { very_friendly: 0.9, friendly: 1.0, selective: 0.6, reactive: 0.3 },
  selective: { very_friendly: 0.5, friendly: 0.6, selective: 0.7, reactive: 0.2 },
  reactive: { very_friendly: 0.2, friendly: 0.3, selective: 0.2, reactive: 0.0 },
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

/** Exponential decay constant for distance scoring (higher = steeper penalty) */
const DISTANCE_DECAY_RATE = 0.15;

export function calculateDistanceScore(distanceKm: number): number {
  return Math.exp(-DISTANCE_DECAY_RATE * distanceKm);
}
