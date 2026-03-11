/**
 * Sync status for offline-first queue entries.
 * Used by the mobile sync engine to track pending mutations.
 */
export const SYNC_STATUS = {
  Pending: 'pending',
  InProgress: 'in_progress',
  Synced: 'synced',
  Failed: 'failed',
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];
