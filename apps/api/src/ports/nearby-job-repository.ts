export interface ActiveNearbyUser {
  id: string;
  displayName: string | null;
  latitude: number;
  longitude: number;
  searchRadiusKm: number;
}

export interface NearbyJobRepository {
  findActiveUsersWithLocation(activeThreshold: Date, limit: number): Promise<ActiveNearbyUser[]>;
  countNearbyUsersWithDogs(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<number>;
}
