import type { SyncQueue } from '@/repositories/interfaces';
import { enqueueMutation } from './sync-engine';

/**
 * SyncQueue implementation backed by the sync engine.
 * Adapts enqueueMutation() into the SyncQueue interface
 * so composite repositories don't depend on sync-engine directly.
 */
export function createSyncQueueAdapter(): SyncQueue {
  return {
    enqueue: enqueueMutation,
  };
}
