import { logger } from '@pawmeet/utils';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/database';
import { isOnline, onNetworkChange } from '@/lib/network';

export interface SyncQueueEntry {
  id: string;
  entity_type: string;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: string;
  status: 'pending' | 'in_progress' | 'failed';
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  created_at: string;
}

type MutationExecutor = (endpoint: string, payload: unknown) => Promise<void>;

const MAX_RETRY_COUNT = 5;
const BASE_BACKOFF_MS = 1000;

let draining = false;
let executor: MutationExecutor | null = null;
let networkUnsub: (() => void) | null = null;

/**
 * Initialize the sync engine with a mutation executor function.
 * The executor is responsible for sending the mutation to the server via tRPC.
 */
export function initSyncEngine(mutationExecutor: MutationExecutor): void {
  executor = mutationExecutor;

  // Drain queue when coming back online
  networkUnsub = onNetworkChange((connected) => {
    if (connected) {
      void drainQueue();
    }
  });
}

/**
 * Stop the sync engine and remove network listener.
 */
export function stopSyncEngine(): void {
  networkUnsub?.();
  networkUnsub = null;
  executor = null;
}

/**
 * Enqueue a mutation for offline sync.
 * If online, attempts to execute immediately. If offline or execution fails,
 * the mutation is persisted in SQLite for later retry.
 */
export async function enqueueMutation(params: {
  entityType: string;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  payload: unknown;
}): Promise<void> {
  const id = Crypto.randomUUID();
  const payloadJson = JSON.stringify(params.payload);

  // Try immediate execution if online
  if (isOnline() && executor) {
    try {
      await executor(params.endpoint, params.payload);
      return; // Success — no need to persist
    } catch {
      // Fall through to enqueue
    }
  }

  // Persist to SQLite sync queue
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, operation, endpoint, payload, status, retry_count, max_retries)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
    [id, params.entityType, params.operation, params.endpoint, payloadJson, MAX_RETRY_COUNT],
  );

  logger.info('SyncEngine', `Enqueued ${params.operation} for ${params.entityType} (offline)`);
}

/**
 * Drain the sync queue — process all pending entries in FIFO order.
 * Called automatically when the device comes back online.
 */
export async function drainQueue(): Promise<void> {
  if (draining || !executor || !isOnline()) return;

  draining = true;
  logger.info('SyncEngine', 'Draining sync queue...');

  try {
    const db = await getDatabase();

    const pending = await db.getAllAsync<SyncQueueEntry>(
      `SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') AND retry_count < max_retries
       ORDER BY created_at ASC`,
    );

    if (pending.length === 0) {
      logger.info('SyncEngine', 'Queue empty');
      return;
    }

    logger.info('SyncEngine', `Processing ${pending.length} queued mutations`);

    for (const entry of pending) {
      if (!isOnline()) {
        logger.info('SyncEngine', 'Lost connection, stopping drain');
        break;
      }

      await db.runAsync(
        `UPDATE sync_queue SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`,
        [entry.id],
      );

      try {
        const payload = JSON.parse(entry.payload) as unknown;
        await executor(entry.endpoint, payload);

        // Success — remove from queue
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [entry.id]);
        logger.debug('SyncEngine', `Synced: ${entry.entity_type}/${entry.operation}`);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        const nextRetry = entry.retry_count + 1;

        if (nextRetry >= entry.max_retries) {
          // Max retries exceeded — mark as permanently failed
          await db.runAsync(
            `UPDATE sync_queue SET status = 'failed', retry_count = ?, last_error = ?, updated_at = datetime('now') WHERE id = ?`,
            [nextRetry, errorMsg, entry.id],
          );
          logger.warn('SyncEngine', `Permanently failed: ${entry.entity_type} — ${errorMsg}`);
        } else {
          // Exponential backoff: wait before next attempt
          await db.runAsync(
            `UPDATE sync_queue SET status = 'pending', retry_count = ?, last_error = ?, updated_at = datetime('now') WHERE id = ?`,
            [nextRetry, errorMsg, entry.id],
          );

          const backoffMs = BASE_BACKOFF_MS * 2 ** nextRetry;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
  } catch (e) {
    logger.warn('SyncEngine', 'Drain failed', e);
  } finally {
    draining = false;
  }
}

/**
 * Get the count of pending items in the sync queue.
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed') AND retry_count < max_retries`,
  );
  return result?.count ?? 0;
}

/**
 * Clear all entries from the sync queue. Use on logout.
 */
export async function clearQueue(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_queue');
}
