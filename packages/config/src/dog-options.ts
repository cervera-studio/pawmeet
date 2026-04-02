/** Dog form option arrays with Italian labels, shared across apps. */

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
} from './dog-enums';

export const SIZE_OPTIONS = [
  { value: DOG_SIZE.TOY, label: 'Toy' },
  { value: DOG_SIZE.SMALL, label: 'Piccola' },
  { value: DOG_SIZE.MEDIUM, label: 'Media' },
  { value: DOG_SIZE.LARGE, label: 'Grande' },
  { value: DOG_SIZE.GIANT, label: 'Gigante' },
] as const;

export const ENERGY_OPTIONS = [
  { value: ENERGY_LEVEL.LOW, label: 'Bassa' },
  { value: ENERGY_LEVEL.MEDIUM, label: 'Media' },
  { value: ENERGY_LEVEL.HIGH, label: 'Alta' },
  { value: ENERGY_LEVEL.VERY_HIGH, label: 'Molto alta' },
] as const;

export const GENDER_OPTIONS = [
  { value: GENDER.MALE, label: 'Maschio' },
  { value: GENDER.FEMALE, label: 'Femmina' },
] as const;

export const BEHAVIOR_DOGS_OPTIONS = [
  { value: BEHAVIOR_WITH_DOGS.VERY_FRIENDLY, label: 'Molto socievole' },
  { value: BEHAVIOR_WITH_DOGS.FRIENDLY, label: 'Socievole' },
  { value: BEHAVIOR_WITH_DOGS.SELECTIVE, label: 'Selettivo' },
  { value: BEHAVIOR_WITH_DOGS.REACTIVE, label: 'Reattivo' },
] as const;

export const BEHAVIOR_PEOPLE_OPTIONS = [
  { value: BEHAVIOR_WITH_PEOPLE.VERY_FRIENDLY, label: 'Molto socievole' },
  { value: BEHAVIOR_WITH_PEOPLE.FRIENDLY, label: 'Socievole' },
  { value: BEHAVIOR_WITH_PEOPLE.SHY, label: 'Timido' },
  { value: BEHAVIOR_WITH_PEOPLE.WARY, label: 'Diffidente' },
] as const;

export const LEASH_OPTIONS = [
  { value: LEASH_BEHAVIOR.EXCELLENT, label: 'Eccellente' },
  { value: LEASH_BEHAVIOR.GOOD, label: 'Buono' },
  { value: LEASH_BEHAVIOR.IN_TRAINING, label: 'In addestramento' },
  { value: LEASH_BEHAVIOR.DIFFICULT, label: 'Difficile' },
] as const;

export const RECALL_OPTIONS = [
  { value: RECALL_RELIABILITY.RELIABLE, label: 'Affidabile' },
  { value: RECALL_RELIABILITY.PARTIAL, label: 'Parziale' },
  { value: RECALL_RELIABILITY.UNRELIABLE, label: 'Non affidabile' },
] as const;

export const WALK_TIME_OPTIONS = [
  { value: WALK_TIME.EARLY_MORNING, label: 'Mattina presto' },
  { value: WALK_TIME.MORNING, label: 'Mattina' },
  { value: WALK_TIME.AFTERNOON, label: 'Pomeriggio' },
  { value: WALK_TIME.EVENING, label: 'Sera' },
  { value: WALK_TIME.LATE_EVENING, label: 'Sera tardi' },
] as const;

export const TERRAIN_OPTIONS = [
  { value: WALK_TERRAIN.URBAN, label: 'Urbano' },
  { value: WALK_TERRAIN.PARK, label: 'Parco' },
  { value: WALK_TERRAIN.COUNTRYSIDE, label: 'Campagna' },
  { value: WALK_TERRAIN.BEACH, label: 'Spiaggia' },
  { value: WALK_TERRAIN.MOUNTAIN, label: 'Montagna' },
] as const;
