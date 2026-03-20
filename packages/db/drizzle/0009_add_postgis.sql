-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop existing B-TREE location indexes (replaced by GiST spatial indexes)
DROP INDEX IF EXISTS "users_location_idx";
DROP INDEX IF EXISTS "group_events_location_idx";

-- Create GiST spatial index on users table
CREATE INDEX "users_location_gist_idx" ON "users" USING gist(
  ST_Point("longitude", "latitude")::geography
) WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- Create GiST spatial index on group_events table
CREATE INDEX "group_events_location_gist_idx" ON "group_events" USING gist(
  ST_Point("longitude", "latitude")::geography
);
