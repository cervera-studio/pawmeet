export interface GpsRetentionRepository {
  purgeOldTrackPoints(retentionDays: number): Promise<void>;
  clearStaleUserLocations(retentionDays: number): Promise<void>;
  purgeOldSafetyCheckins(retentionDays: number): Promise<void>;
  purgeOldNotifications(retentionDays: number): Promise<void>;
  purgeOldAuditLogs(retentionDays: number): Promise<void>;
}
