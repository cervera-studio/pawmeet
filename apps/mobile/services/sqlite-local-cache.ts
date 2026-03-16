import { getDatabase } from '@/lib/database';
import type { BindValue, LocalCache } from '@/repositories/interfaces';

/**
 * LocalCache implementation backed by SQLite via expo-sqlite.
 * Adapts the raw database into the LocalCache interface
 * so composite repositories don't depend on SQLite directly.
 */
export function createSqliteLocalCache(): LocalCache {
  return {
    async getAll<T>(query: string, params?: BindValue[]): Promise<T[]> {
      const db = await getDatabase();
      return db.getAllAsync<T>(query, params ?? []);
    },

    async run(query: string, params?: BindValue[]): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(query, params ?? []);
    },
  };
}
