import { logger } from '@pawmeet/utils';
import { Directory, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'pawmeet.db';
const SCHEMA_VERSION = 2;
const SQLITE_KEY_STORE_KEY = 'pawmeet_sqlite_enc_key';

let db: SQLite.SQLiteDatabase | null = null;

/** Get or generate the SQLCipher encryption key, stored in SecureStore. */
async function getEncryptionKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(SQLITE_KEY_STORE_KEY);
  if (existing) return existing;

  const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(SQLITE_KEY_STORE_KEY, key);
  return key;
}

/**
 * Get or create the SQLite database instance.
 * Encrypted with SQLCipher — key stored in SecureStore.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const encKey = await getEncryptionKey();
  db = await SQLite.openDatabaseAsync(DB_NAME);
  // SQLCipher: set key immediately after opening — before any other statement
  await db.execAsync(`PRAGMA key = '${encKey}';`);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);

  logger.info('SQLite', `Database initialized (v${SCHEMA_VERSION})`);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
        endpoint TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'failed')),
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 5,
        last_error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);

      CREATE TABLE IF NOT EXISTS cached_conversations (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cached_messages_match ON cached_messages(match_id);

      CREATE TABLE IF NOT EXISTS cached_feed (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cached_feed_created ON cached_feed(created_at DESC);

      PRAGMA user_version = 1;
    `);
  }

  if (currentVersion < 2) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_group_conversations (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_group_messages (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cached_group_messages_event ON cached_group_messages(event_id);

      CREATE TABLE IF NOT EXISTS cached_events (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_walks (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_badges (
        id TEXT PRIMARY KEY,
        dog_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_cached_badges_dog ON cached_badges(dog_id);

      CREATE TABLE IF NOT EXISTS cached_gamification (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_follows (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS cached_match_suggestions (
        dog_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      PRAGMA user_version = 2;
    `);
  }
}

/**
 * Close the database connection. Call on logout or cleanup.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Delete the SQLite database file. Call on logout to wipe cached data.
 */
export async function wipeDatabase(): Promise<void> {
  await closeDatabase();
  try {
    const sqliteDir = new Directory(Paths.document, 'SQLite');
    if (sqliteDir.exists) {
      sqliteDir.delete();
    }
  } catch (e) {
    logger.warn('SQLite', 'Failed to wipe database files', e);
  }
}
