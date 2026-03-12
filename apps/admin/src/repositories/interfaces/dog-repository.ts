import type { PaginatedResult } from '@pawmeet/types';

export interface AdminDogListItem {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  isActive: boolean;
  createdAt: string;
  ownerName: string | null;
  ownerId: string | null;
}

export interface AdminDogDetail extends AdminDogListItem {
  breedSecondary: string | null;
  weightKg: number | null;
  gender: string | null;
  isNeutered: boolean | null;
  energyLevel: string | null;
  behaviorWithDogs: string | null;
  behaviorWithPeople: string | null;
  leashBehavior: string | null;
  bio: string | null;
  photos: {
    id: string;
    url: string;
    position: number;
    moderationStatus: string;
  }[];
}

export interface ListDogsParams {
  page: number;
  pageSize: number;
  search?: string;
}

export interface AdminDogRepository {
  list(params: ListDogsParams): Promise<PaginatedResult<AdminDogListItem>>;
  getById(id: string): Promise<AdminDogDetail>;
}
