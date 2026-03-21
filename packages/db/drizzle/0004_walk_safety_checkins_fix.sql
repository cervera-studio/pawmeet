-- #394: Fix walkSafetyCheckins schema
-- 1. Convert GPS columns from text to double precision
-- 2. Add missing FK on walkId → walks(id)
-- 3. Add CHECK constraints for valid GPS ranges

-- Convert GPS columns (cast existing text values to double precision)
ALTER TABLE "walk_safety_checkins"
  ALTER COLUMN "latitude" TYPE double precision USING "latitude"::double precision,
  ALTER COLUMN "longitude" TYPE double precision USING "longitude"::double precision;

-- Add missing FK constraint on walkId
ALTER TABLE "walk_safety_checkins"
  ADD CONSTRAINT "walk_safety_checkins_walk_id_walks_id_fk"
  FOREIGN KEY ("walk_id") REFERENCES "walks"("id") ON DELETE CASCADE;

-- Add CHECK constraints for valid GPS ranges
ALTER TABLE "walk_safety_checkins"
  ADD CONSTRAINT "walk_safety_checkins_lat_range"
  CHECK ("latitude" IS NULL OR ("latitude" BETWEEN -90 AND 90));

ALTER TABLE "walk_safety_checkins"
  ADD CONSTRAINT "walk_safety_checkins_lon_range"
  CHECK ("longitude" IS NULL OR ("longitude" BETWEEN -180 AND 180));
