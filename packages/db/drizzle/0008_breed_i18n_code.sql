-- Migration: Replace breeds.name + breeds.name_it with breeds.code
-- The code column stores a locale-independent slug (e.g. "australian_shepherd")
-- Display names are resolved via i18n translation files in packages/config/src/breeds/

-- Step 1: Add code column (nullable initially)
ALTER TABLE "breeds" ADD COLUMN "code" varchar(100);

-- Step 2: Populate code from name (slugify: lowercase, replace non-alphanumeric with underscore, trim underscores)
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
);

-- Step 3: Make code NOT NULL and UNIQUE
ALTER TABLE "breeds" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_code_unique" UNIQUE ("code");

-- Step 4: Drop old columns and their constraints
ALTER TABLE "breeds" DROP CONSTRAINT IF EXISTS "breeds_name_unique";
ALTER TABLE "breeds" DROP COLUMN "name";
ALTER TABLE "breeds" DROP COLUMN "name_it";
