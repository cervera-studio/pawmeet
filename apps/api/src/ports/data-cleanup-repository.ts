export interface DataCleanupRepository {
  purgeDeactivatedAccounts(now: Date): Promise<{ id: string; email: string }[]>;
  cleanExpiredRefreshTokens(): Promise<void>;
  cleanExpiredVerificationTokens(olderThan: Date): Promise<void>;
  findStaleInactiveMatchIds(olderThan: Date): Promise<string[]>;
  hardDeleteSoftDeletedMessages(matchIds: string[]): Promise<void>;
  findExpiredGdprExports(): Promise<{ id: string; r2Key: string | null }[]>;
  deleteGdprExports(ids: string[]): Promise<void>;
}
