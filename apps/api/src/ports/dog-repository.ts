import type { DogPhoto, DogProfile } from '@pawmeet/types';

export interface CreateDogInput {
  ownerId: string;
  name: string;
  birthDate: Date;
  breed: string;
  breedSecondary?: string | null;
  size: string;
  weightKg: number;
  gender: string;
  isNeutered: boolean;
  energyLevel: string;
  behaviorWithDogs: string;
  behaviorWithPeople: string;
  leashBehavior: string;
  recallReliability?: string | null;
  bio?: string | null;
  walkPrefTime: string[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: string[];
}

export interface DogRepository {
  findById(id: string): Promise<DogProfile | null>;
  findByOwner(ownerId: string, activeOnly?: boolean): Promise<DogProfile[]>;
  findByIds(ids: string[]): Promise<DogProfile[]>;
  findByIdAndOwner(id: string, ownerId: string): Promise<DogProfile | null>;
  countByOwner(ownerId: string): Promise<number>;
  create(input: CreateDogInput): Promise<DogProfile>;
  update(id: string, data: Partial<CreateDogInput>): Promise<DogProfile>;
  softDelete(id: string): Promise<void>;

  // Photos
  findPhotos(dogId: string): Promise<DogPhoto[]>;
  findPhotosByDogIds(dogIds: string[]): Promise<DogPhoto[]>;
  countPhotos(dogId: string): Promise<number>;
  addPhoto(input: {
    dogId: string;
    url: string;
    position: number;
    isPrimary: boolean;
  }): Promise<DogPhoto>;
  findPhoto(photoId: string, dogId: string): Promise<DogPhoto | null>;
  deletePhoto(photoId: string): Promise<void>;
  updatePhotoPositions(
    updates: { id: string; position: number; isPrimary: boolean }[],
  ): Promise<void>;
  findPhotoById(photoId: string): Promise<DogPhoto | null>;
  updatePhotoModerationStatus(photoId: string, status: 'approved' | 'rejected'): Promise<void>;
}
