export interface DogFeatureRow {
  id: string;
  birthDate: Date;
  isNeutered: boolean;
  size: string;
  energyLevel: string;
  behaviorWithDogs: string;
  leashBehavior: string;
  walkPrefTime: string[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: string[];
}

export interface MlFeatureRepository {
  getActiveDogsBatch(limit: number, offset: number): Promise<DogFeatureRow[]>;
  getActiveUserIdsBatch(limit: number, offset: number): Promise<{ id: string }[]>;
  getUserSwipeStats(userId: string): Promise<{ total: number; likes: number }>;
  getUserMatchPrefs(userId: string): Promise<{ successRate: number; sampleSize: number } | null>;
  getUserAvgMessages(userId: string): Promise<number>;
  getUserWalkStats(userId: string): Promise<{ total: number; completed: number }>;
}
