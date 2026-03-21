-- Post-migration script: spatial and vector indexes
-- Run this manually after drizzle migrate (neon-http doesn't support :: cast syntax)
-- Usage: psql $DATABASE_URL -f packages/db/drizzle/post-migrate.sql

-- PostGIS spatial indexes (use CAST syntax for Neon serverless compatibility)
CREATE INDEX IF NOT EXISTS "users_location_gist_idx" ON "users" USING gist(
  CAST(ST_Point("longitude", "latitude") AS geography)
) WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "group_events_location_gist_idx" ON "group_events" USING gist(
  CAST(ST_Point("longitude", "latitude") AS geography)
);

-- pg_trgm GIN index for user name ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "users_display_name_trgm_idx" ON "users"
  USING gin("display_name" gin_trgm_ops);

-- pgvector HNSW index
CREATE INDEX IF NOT EXISTS "dog_embeddings_hnsw_idx" ON "dog_embeddings"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
