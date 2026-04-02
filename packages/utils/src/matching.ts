// Compatibility matrices from MVP spec (doc 02)
import { BEHAVIOR_WITH_DOGS, DOG_SIZE, ENERGY_LEVEL } from '@pawmeet/config';
import type { BehaviorWithDogs, DogSize, EnergyLevel } from '@pawmeet/types';

const SIZE_MATRIX: Record<DogSize, Record<DogSize, number>> = {
  [DOG_SIZE.TOY]: {
    [DOG_SIZE.TOY]: 1.0,
    [DOG_SIZE.SMALL]: 0.7,
    [DOG_SIZE.MEDIUM]: 0.3,
    [DOG_SIZE.LARGE]: 0.1,
    [DOG_SIZE.GIANT]: 0.0,
  },
  [DOG_SIZE.SMALL]: {
    [DOG_SIZE.TOY]: 0.7,
    [DOG_SIZE.SMALL]: 1.0,
    [DOG_SIZE.MEDIUM]: 0.7,
    [DOG_SIZE.LARGE]: 0.3,
    [DOG_SIZE.GIANT]: 0.1,
  },
  [DOG_SIZE.MEDIUM]: {
    [DOG_SIZE.TOY]: 0.3,
    [DOG_SIZE.SMALL]: 0.7,
    [DOG_SIZE.MEDIUM]: 1.0,
    [DOG_SIZE.LARGE]: 0.7,
    [DOG_SIZE.GIANT]: 0.3,
  },
  [DOG_SIZE.LARGE]: {
    [DOG_SIZE.TOY]: 0.1,
    [DOG_SIZE.SMALL]: 0.3,
    [DOG_SIZE.MEDIUM]: 0.7,
    [DOG_SIZE.LARGE]: 1.0,
    [DOG_SIZE.GIANT]: 0.7,
  },
  [DOG_SIZE.GIANT]: {
    [DOG_SIZE.TOY]: 0.0,
    [DOG_SIZE.SMALL]: 0.1,
    [DOG_SIZE.MEDIUM]: 0.3,
    [DOG_SIZE.LARGE]: 0.7,
    [DOG_SIZE.GIANT]: 1.0,
  },
};

const ENERGY_MATRIX: Record<EnergyLevel, Record<EnergyLevel, number>> = {
  [ENERGY_LEVEL.LOW]: {
    [ENERGY_LEVEL.LOW]: 1.0,
    [ENERGY_LEVEL.MEDIUM]: 0.6,
    [ENERGY_LEVEL.HIGH]: 0.2,
    [ENERGY_LEVEL.VERY_HIGH]: 0.0,
  },
  [ENERGY_LEVEL.MEDIUM]: {
    [ENERGY_LEVEL.LOW]: 0.6,
    [ENERGY_LEVEL.MEDIUM]: 1.0,
    [ENERGY_LEVEL.HIGH]: 0.7,
    [ENERGY_LEVEL.VERY_HIGH]: 0.3,
  },
  [ENERGY_LEVEL.HIGH]: {
    [ENERGY_LEVEL.LOW]: 0.2,
    [ENERGY_LEVEL.MEDIUM]: 0.7,
    [ENERGY_LEVEL.HIGH]: 1.0,
    [ENERGY_LEVEL.VERY_HIGH]: 0.8,
  },
  [ENERGY_LEVEL.VERY_HIGH]: {
    [ENERGY_LEVEL.LOW]: 0.0,
    [ENERGY_LEVEL.MEDIUM]: 0.3,
    [ENERGY_LEVEL.HIGH]: 0.8,
    [ENERGY_LEVEL.VERY_HIGH]: 1.0,
  },
};

const BEHAVIOR_MATRIX: Record<BehaviorWithDogs, Record<BehaviorWithDogs, number>> = {
  [BEHAVIOR_WITH_DOGS.VERY_FRIENDLY]: {
    [BEHAVIOR_WITH_DOGS.VERY_FRIENDLY]: 1.0,
    [BEHAVIOR_WITH_DOGS.FRIENDLY]: 0.9,
    [BEHAVIOR_WITH_DOGS.SELECTIVE]: 0.5,
    [BEHAVIOR_WITH_DOGS.REACTIVE]: 0.2,
  },
  [BEHAVIOR_WITH_DOGS.FRIENDLY]: {
    [BEHAVIOR_WITH_DOGS.VERY_FRIENDLY]: 0.9,
    [BEHAVIOR_WITH_DOGS.FRIENDLY]: 1.0,
    [BEHAVIOR_WITH_DOGS.SELECTIVE]: 0.6,
    [BEHAVIOR_WITH_DOGS.REACTIVE]: 0.3,
  },
  [BEHAVIOR_WITH_DOGS.SELECTIVE]: {
    [BEHAVIOR_WITH_DOGS.VERY_FRIENDLY]: 0.5,
    [BEHAVIOR_WITH_DOGS.FRIENDLY]: 0.6,
    [BEHAVIOR_WITH_DOGS.SELECTIVE]: 0.7,
    [BEHAVIOR_WITH_DOGS.REACTIVE]: 0.2,
  },
  [BEHAVIOR_WITH_DOGS.REACTIVE]: {
    [BEHAVIOR_WITH_DOGS.VERY_FRIENDLY]: 0.2,
    [BEHAVIOR_WITH_DOGS.FRIENDLY]: 0.3,
    [BEHAVIOR_WITH_DOGS.SELECTIVE]: 0.2,
    [BEHAVIOR_WITH_DOGS.REACTIVE]: 0.0,
  },
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
