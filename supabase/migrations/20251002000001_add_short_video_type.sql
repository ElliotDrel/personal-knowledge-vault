-- Migration: Add 'short-video' to resource_type enum
-- Date: 2025-10-02
-- Description: Expands resource_type enum to support short-form video content as a first-class type,
--              separate from long-form 'video' resources. Uses create-copy-drop pattern for safety.

BEGIN;

-- Step 1: Create new enum with 'short-video' added
CREATE TYPE resource_type_new AS ENUM (
  'book',
  'video',
  'podcast',
  'article',
  'short-video'
);

-- Step 2: Migrate resources table to use new enum
ALTER TABLE resources
  ALTER COLUMN type TYPE resource_type_new
  USING type::text::resource_type_new;

-- Step 3: Migrate resource_type_configs table to use new enum
ALTER TABLE resource_type_configs
  ALTER COLUMN resource_type TYPE resource_type_new
  USING resource_type::text::resource_type_new;

-- Step 4: Drop old enum and rename new one
DROP TYPE resource_type;
ALTER TYPE resource_type_new RENAME TO resource_type;

-- Step 5: Add documentation comment
COMMENT ON TYPE resource_type IS 'Resource types: book, video (long-form), podcast, article, short-video (short-form social media)';

COMMIT;

-- Validation Query (run manually after migration):
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'resource_type'::regtype ORDER BY enumsortorder;
-- Expected: book, video, podcast, article, short-video
