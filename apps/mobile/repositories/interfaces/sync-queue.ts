/**
 * Abstraction for the offline mutation sync queue.
 * Composite repositories use this to enqueue mutations when offline,
 * without coupling to the concrete SQLite/SyncEngine implementation.
 */
export interface SyncQueue {
  enqueue(params: {
    entityType: string;
    operation: 'create' | 'update' | 'delete';
    endpoint: string;
    payload: unknown;
  }): Promise<void>;
}

/**
 * Abstraction for network connectivity state.
 * Injected into composite repositories so they don't depend on
 * the concrete NetInfo implementation.
 */
export interface NetworkState {
  isOnline(): boolean;
}

/** Values that can be bound to SQLite parameters. */
export type BindValue = string | number | null;

/**
 * Abstraction for local cache storage (SQLite).
 * Composite repositories use this instead of importing getDatabase() directly.
 */
export interface LocalCache {
  getAll<T>(query: string, params?: BindValue[]): Promise<T[]>;
  run(query: string, params?: BindValue[]): Promise<void>;
}
