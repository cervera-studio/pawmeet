export interface RecommendationUserRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
  searchRadiusKm: number;
}

export interface NearbyCandidateRow {
  id: string;
  ownerId: string;
  name: string;
  birthDate: Date;
  breed: string;
  breedSecondary: string | null;
  size: string;
  weightKg: number;
  gender: string;
  isNeutered: boolean;
  energyLevel: string;
  behaviorWithDogs: string;
  behaviorWithPeople: string;
  leashBehavior: string;
  recallReliability: string | null;
  bio: string | null;
  walkPrefTime: string[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerLatitude: number | null;
  ownerLongitude: number | null;
  distanceKm: number;
}

export interface MlRecommendationsRepository {
  getActiveUsersWithLocationBatch(
    activeThreshold: Date,
    limit: number,
    offset: number,
  ): Promise<RecommendationUserRow[]>;
  getUserActiveDogs(userId: string): Promise<NearbyCandidateRow[]>;
  getBlockedUserIds(userId: string): Promise<string[]>;
  getBlockerUserIds(userId: string): Promise<string[]>;
  getSwipedDogIds(userDogIds: string[]): Promise<string[]>;
  getNearbyDogsWithDistance(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<NearbyCandidateRow[]>;
}
