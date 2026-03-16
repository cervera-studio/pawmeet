export interface GpsRetentionRepository {
  purgeOldTrackPoints(retentionDays: number): Promise<void>;
  clearStaleUserLocations(retentionDays: number): Promise<void>;
}
