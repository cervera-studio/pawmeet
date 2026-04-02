export const DOG_SIZE = {
  TOY: 'toy',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  GIANT: 'giant',
} as const;

export const ENERGY_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
} as const;

export const BEHAVIOR_WITH_DOGS = {
  VERY_FRIENDLY: 'very_friendly',
  FRIENDLY: 'friendly',
  SELECTIVE: 'selective',
  REACTIVE: 'reactive',
} as const;

export const BEHAVIOR_WITH_PEOPLE = {
  VERY_FRIENDLY: 'very_friendly',
  FRIENDLY: 'friendly',
  SHY: 'shy',
  WARY: 'wary',
} as const;

export const LEASH_BEHAVIOR = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  IN_TRAINING: 'in_training',
  DIFFICULT: 'difficult',
} as const;

export const RECALL_RELIABILITY = {
  RELIABLE: 'reliable',
  PARTIAL: 'partial',
  UNRELIABLE: 'unreliable',
} as const;

export const WALK_TIME = {
  EARLY_MORNING: 'early_morning',
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  LATE_EVENING: 'late_evening',
} as const;

export const WALK_TERRAIN = {
  URBAN: 'urban',
  PARK: 'park',
  COUNTRYSIDE: 'countryside',
  BEACH: 'beach',
  MOUNTAIN: 'mountain',
} as const;

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
} as const;
