-- Migration: Replace breeds.name + breeds.name_it with breeds.code
-- The code column stores a locale-independent slug (e.g. "australian_shepherd")
-- Display names are resolved via i18n translation files in packages/config/src/breeds/
-- NOTE: Already applied to production. Wrapped in IF NOT EXISTS for safety.

-- Step 1: Add code column if it doesn't exist
ALTER TABLE "breeds" ADD COLUMN IF NOT EXISTS "code" varchar(100);

-- Step 2: Populate code from name (only if name column still exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeds' AND column_name = 'name') THEN
    UPDATE "breeds"
    SET "code" = regexp_replace(
      regexp_replace(
        regexp_replace(
          lower("name"),
          '[^a-z0-9]+', '_', 'g'
        ),
        '^_|_$', '', 'g'
      ),
      '_+', '_', 'g'
    )
    WHERE "code" IS NULL;
  END IF;
END $$;

-- Step 3: Make code NOT NULL and UNIQUE (skip if already set)
ALTER TABLE "breeds" ALTER COLUMN "code" SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'breeds_code_unique') THEN
    ALTER TABLE "breeds" ADD CONSTRAINT "breeds_code_unique" UNIQUE ("code");
  END IF;
END $$;

-- Step 4: Drop old columns and their constraints
ALTER TABLE "breeds" DROP CONSTRAINT IF EXISTS "breeds_name_unique";
ALTER TABLE "breeds" DROP COLUMN IF EXISTS "name";
ALTER TABLE "breeds" DROP COLUMN IF EXISTS "name_it";
