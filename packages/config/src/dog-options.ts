/**
 * Dog form option arrays shared across apps.
 * Labels are i18n keys under the `dogOptions` namespace.
 */

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
  { value: DOG_SIZE.TOY, labelKey: 'dogOptions.size.toy' },
  { value: DOG_SIZE.SMALL, labelKey: 'dogOptions.size.small' },
  { value: DOG_SIZE.MEDIUM, labelKey: 'dogOptions.size.medium' },
  { value: DOG_SIZE.LARGE, labelKey: 'dogOptions.size.large' },
  { value: DOG_SIZE.GIANT, labelKey: 'dogOptions.size.giant' },
] as const;

export const ENERGY_OPTIONS = [
  { value: ENERGY_LEVEL.LOW, labelKey: 'dogOptions.energy.low' },
  { value: ENERGY_LEVEL.MEDIUM, labelKey: 'dogOptions.energy.medium' },
  { value: ENERGY_LEVEL.HIGH, labelKey: 'dogOptions.energy.high' },
  { value: ENERGY_LEVEL.VERY_HIGH, labelKey: 'dogOptions.energy.very_high' },
] as const;

export const GENDER_OPTIONS = [
  { value: GENDER.MALE, labelKey: 'dogOptions.gender.male' },
  { value: GENDER.FEMALE, labelKey: 'dogOptions.gender.female' },
] as const;

export const BEHAVIOR_DOGS_OPTIONS = [
  { value: BEHAVIOR_WITH_DOGS.VERY_FRIENDLY, labelKey: 'dogOptions.behaviorDogs.very_friendly' },
  { value: BEHAVIOR_WITH_DOGS.FRIENDLY, labelKey: 'dogOptions.behaviorDogs.friendly' },
  { value: BEHAVIOR_WITH_DOGS.SELECTIVE, labelKey: 'dogOptions.behaviorDogs.selective' },
  { value: BEHAVIOR_WITH_DOGS.REACTIVE, labelKey: 'dogOptions.behaviorDogs.reactive' },
] as const;

export const BEHAVIOR_PEOPLE_OPTIONS = [
  {
    value: BEHAVIOR_WITH_PEOPLE.VERY_FRIENDLY,
    labelKey: 'dogOptions.behaviorPeople.very_friendly',
  },
  { value: BEHAVIOR_WITH_PEOPLE.FRIENDLY, labelKey: 'dogOptions.behaviorPeople.friendly' },
  { value: BEHAVIOR_WITH_PEOPLE.SHY, labelKey: 'dogOptions.behaviorPeople.shy' },
  { value: BEHAVIOR_WITH_PEOPLE.WARY, labelKey: 'dogOptions.behaviorPeople.wary' },
] as const;

export const LEASH_OPTIONS = [
  { value: LEASH_BEHAVIOR.EXCELLENT, labelKey: 'dogOptions.leash.excellent' },
  { value: LEASH_BEHAVIOR.GOOD, labelKey: 'dogOptions.leash.good' },
  { value: LEASH_BEHAVIOR.IN_TRAINING, labelKey: 'dogOptions.leash.in_training' },
  { value: LEASH_BEHAVIOR.DIFFICULT, labelKey: 'dogOptions.leash.difficult' },
] as const;

export const RECALL_OPTIONS = [
  { value: RECALL_RELIABILITY.RELIABLE, labelKey: 'dogOptions.recall.reliable' },
  { value: RECALL_RELIABILITY.PARTIAL, labelKey: 'dogOptions.recall.partial' },
  { value: RECALL_RELIABILITY.UNRELIABLE, labelKey: 'dogOptions.recall.unreliable' },
] as const;

export const WALK_TIME_OPTIONS = [
  { value: WALK_TIME.EARLY_MORNING, labelKey: 'dogOptions.walkTime.early_morning' },
  { value: WALK_TIME.MORNING, labelKey: 'dogOptions.walkTime.morning' },
  { value: WALK_TIME.AFTERNOON, labelKey: 'dogOptions.walkTime.afternoon' },
  { value: WALK_TIME.EVENING, labelKey: 'dogOptions.walkTime.evening' },
  { value: WALK_TIME.LATE_EVENING, labelKey: 'dogOptions.walkTime.late_evening' },
] as const;

export const TERRAIN_OPTIONS = [
  { value: WALK_TERRAIN.URBAN, labelKey: 'dogOptions.terrain.urban' },
  { value: WALK_TERRAIN.PARK, labelKey: 'dogOptions.terrain.park' },
  { value: WALK_TERRAIN.COUNTRYSIDE, labelKey: 'dogOptions.terrain.countryside' },
  { value: WALK_TERRAIN.BEACH, labelKey: 'dogOptions.terrain.beach' },
  { value: WALK_TERRAIN.MOUNTAIN, labelKey: 'dogOptions.terrain.mountain' },
] as const;
