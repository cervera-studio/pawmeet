-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create dog_embeddings table (separate from dog_profiles for schema flexibility)
CREATE TABLE "dog_embeddings" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "dog_id" UUID NOT NULL UNIQUE REFERENCES "dog_profiles"("id") ON DELETE CASCADE,
  "embedding" vector(768) NOT NULL,
  "model_version" VARCHAR(50) NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX "dog_embeddings_hnsw_idx" ON "dog_embeddings"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- B-tree indexes for lookups
CREATE UNIQUE INDEX "dog_embeddings_dog_id_idx" ON "dog_embeddings" ("dog_id");
CREATE INDEX "dog_embeddings_model_version_idx" ON "dog_embeddings" ("model_version");
