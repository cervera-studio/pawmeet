export interface UserLocationRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
  searchRadiusKm: number;
}

export interface ActivityWindowRow {
  dayOfWeek: number;
  hourOfDay: number;
  activityCount: number;
}

export interface NearbyActivityRow {
  dayOfWeek: number;
  hourOfDay: number;
  totalActivity: number;
  userCount: number;
}

export interface MlOptimalTimesRepository {
  getActiveUsersWithLocationBatch(
    activeThreshold: Date,
    limit: number,
    offset: number,
  ): Promise<UserLocationRow[]>;
  getUserActivityWindows(userId: string): Promise<ActivityWindowRow[]>;
  getNearbyActivityWindows(
    userId: string,
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<NearbyActivityRow[]>;
}
