/**
 * Post-migration script: creates extensions and spatial/vector indexes
 * that can't be expressed in Drizzle migrations (neon-http doesn't support :: cast).
 *
 * All statements are idempotent (IF NOT EXISTS / IF EXISTS).
 * Run after drizzle migrate in CI and local setup.
 */
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const statements = [
  'CREATE EXTENSION IF NOT EXISTS postgis',
  'CREATE EXTENSION IF NOT EXISTS vector',
  `CREATE INDEX IF NOT EXISTS users_location_gist_idx ON users USING gist(CAST(ST_Point(longitude, latitude) AS geography)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS group_events_location_gist_idx ON group_events USING gist(CAST(ST_Point(longitude, latitude) AS geography))`,
  `CREATE INDEX IF NOT EXISTS dog_embeddings_hnsw_idx ON dog_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`,
];

let ok = 0;
for (const stmt of statements) {
  try {
    await sql.query(stmt);
    ok++;
  } catch (e) {
    console.error(`WARN: ${stmt.substring(0, 60)}... — ${e.message}`);
  }
}

console.log(`Post-migration: ${ok}/${statements.length} statements applied`);
