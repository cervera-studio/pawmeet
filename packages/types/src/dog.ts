export type DogSize = 'toy' | 'small' | 'medium' | 'large' | 'giant';
export type EnergyLevel = 'low' | 'medium' | 'high' | 'very_high';
export type BehaviorWithDogs = 'very_friendly' | 'friendly' | 'selective' | 'reactive';
export type BehaviorWithPeople = 'very_friendly' | 'friendly' | 'shy' | 'wary';
export type LeashBehavior = 'excellent' | 'good' | 'in_training' | 'difficult';
export type RecallReliability = 'reliable' | 'partial' | 'unreliable';
export type WalkTime = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_evening';
export type WalkTerrain = 'urban' | 'park' | 'countryside' | 'beach' | 'mountain';
export type Gender = 'male' | 'female';

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

export interface DogPhoto {
  id: string;
  dogId: string;
  url: string;
  position: number;
  isPrimary: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
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
