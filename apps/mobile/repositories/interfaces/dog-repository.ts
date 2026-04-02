import type { RouterOutput } from '@pawmeet/api-client';
import type {
  BehaviorWithDogs,
  BehaviorWithPeople,
  DogSize,
  EnergyLevel,
  Gender,
  LeashBehavior,
  WalkTerrain,
  WalkTime,
} from '@pawmeet/types';
import type { CreateDogInput } from '@pawmeet/validation';

type DogCreateResult = RouterOutput['dogs']['create'];

export interface GenerateBioInput {
  name: string;
  breed: string;
  breedSecondary?: string;
  size: DogSize;
  gender: Gender;
  energyLevel: EnergyLevel;
  behaviorWithDogs: BehaviorWithDogs;
  behaviorWithPeople: BehaviorWithPeople;
  leashBehavior: LeashBehavior;
  walkPrefTime: WalkTime[];
  walkPrefTerrain: WalkTerrain[];
}

export interface AnalyzePhotoInput {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface AnalyzePhotoResult {
  breed: string;
  size: string;
  breedSecondary?: string | null;
}

export interface DogRepository {
  create(data: CreateDogInput): Promise<DogCreateResult>;
  generateBio(input: GenerateBioInput): Promise<{ bio: string }>;
  analyzePhoto(input: AnalyzePhotoInput): Promise<{ analysis: AnalyzePhotoResult }>;
}
