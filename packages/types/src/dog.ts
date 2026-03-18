export type DogSize = 'toy' | 'piccola' | 'media' | 'grande' | 'gigante';
export type EnergyLevel = 'bassa' | 'media' | 'alta' | 'molto_alta';
export type BehaviorWithDogs = 'molto_socievole' | 'socievole' | 'selettivo' | 'reattivo';
export type BehaviorWithPeople = 'molto_socievole' | 'socievole' | 'timido' | 'diffidente';
export type LeashBehavior = 'eccellente' | 'buono' | 'in_addestramento' | 'difficile';
export type RecallReliability = 'affidabile' | 'parziale' | 'non_affidabile';
export type WalkTime = 'mattina_presto' | 'mattina' | 'pomeriggio' | 'sera' | 'sera_tardi';
export type WalkTerrain = 'urbano' | 'parco' | 'campagna' | 'spiaggia' | 'montagna';
export type Gender = 'maschio' | 'femmina';

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
