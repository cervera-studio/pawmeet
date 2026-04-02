import type {
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

export type DogSize = (typeof DOG_SIZE)[keyof typeof DOG_SIZE];
export type EnergyLevel = (typeof ENERGY_LEVEL)[keyof typeof ENERGY_LEVEL];
export type BehaviorWithDogs = (typeof BEHAVIOR_WITH_DOGS)[keyof typeof BEHAVIOR_WITH_DOGS];
export type BehaviorWithPeople = (typeof BEHAVIOR_WITH_PEOPLE)[keyof typeof BEHAVIOR_WITH_PEOPLE];
export type LeashBehavior = (typeof LEASH_BEHAVIOR)[keyof typeof LEASH_BEHAVIOR];
export type RecallReliability = (typeof RECALL_RELIABILITY)[keyof typeof RECALL_RELIABILITY];
export type WalkTime = (typeof WALK_TIME)[keyof typeof WALK_TIME];
export type WalkTerrain = (typeof WALK_TERRAIN)[keyof typeof WALK_TERRAIN];
export type Gender = (typeof GENDER)[keyof typeof GENDER];

export interface DogProfile {
  id: string;
  ownerId: string;
  name: string;
  birthDate: Date;
  breed: string;
  breedSecondary: string | null;
  size: DogSize;
  weightKg: number;
  gender: Gender;
  isNeutered: boolean;
  energyLevel: EnergyLevel;
  behaviorWithDogs: BehaviorWithDogs;
  behaviorWithPeople: BehaviorWithPeople;
  leashBehavior: LeashBehavior;
  recallReliability: RecallReliability | null;
  bio: string | null;
  walkPrefTime: WalkTime[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: WalkTerrain[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoveryFilters {
  size?: DogSize[];
  energyLevel?: EnergyLevel[];
  gender?: Gender[];
  behaviorWithDogs?: BehaviorWithDogs[];
  walkPrefTime?: WalkTime[];
  walkPrefTerrain?: WalkTerrain[];
  maxDistanceKm?: number;
}

export const PHOTO_MODERATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type PhotoModerationStatus =
  (typeof PHOTO_MODERATION_STATUS)[keyof typeof PHOTO_MODERATION_STATUS];

export interface DogPhoto {
  id: string;
  dogId: string;
  url: string;
  position: number;
  isPrimary: boolean;
  moderationStatus: PhotoModerationStatus;
  uploadedAt: Date;
}

export interface PublicDogProfile {
  id: string;
  name: string;
  breed: string;
  breedSecondary: string | null;
  size: DogSize;
  weightKg: number;
  gender: Gender;
  energyLevel: EnergyLevel;
  behaviorWithDogs: BehaviorWithDogs;
  bio: string | null;
  ageMonths: number;
  ownerFirstName: string;
  photos: Pick<DogPhoto, 'url' | 'position' | 'isPrimary'>[];
}
