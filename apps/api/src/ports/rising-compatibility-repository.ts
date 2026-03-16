export interface RisingCompatibilityRepository {
  getActiveUsersWithLocationBatch(
    activeThreshold: Date,
    limit: number,
    offset: number,
  ): Promise<{ id: string }[]>;
}
