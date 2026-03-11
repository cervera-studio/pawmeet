export interface NearbyUser {
  [key: string]: unknown;
  id: string;
}

export interface UserRepository {
  findNearby(radiusKm: number): Promise<{ users: NearbyUser[] }>;
  updateLocation(latitude: number, longitude: number): Promise<void>;
  registerPushToken(token: string): Promise<void>;
}
