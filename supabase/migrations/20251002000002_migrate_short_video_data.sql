-- Migration: Migrate existing short-form video data to 'short-video' type
-- Date: 2025-10-02
-- Description: Identifies all video resources with shortFormPlatform metadata,
--              converts them to 'short-video' type, and flattens nested metadata
--              into top-level fields. Creates partial index for platform filtering.

BEGIN;

-- Step 1: Create helper function to flatten short-form metadata
-- This function extracts nested shortFormMetadata fields and promotes them to top-level
CREATE OR REPLACE FUNCTION flatten_short_form_metadata(metadata jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'platform', metadata->>'shortFormPlatform',
      'channelName', metadata->'shortFormMetadata'->>'channelName',
      'handle', metadata->'shortFormMetadata'->>'handle',
      'viewCount', (metadata->'shortFormMetadata'->>'viewCount')::int,
      'hashtags', metadata->'shortFormMetadata'->'hashtags',
      'extractedAt', metadata->'shortFormMetadata'->>'extractedAt',
      'extractionMethod', metadata->'shortFormMetadata'->>'extractionMethod',
      'creator', metadata->>'creator',
      'duration', metadata->>'duration',
      'url', metadata->>'url',
      'year', (metadata->>'year')::int
    )
  );
$$;

COMMENT ON FUNCTION flatten_short_form_metadata IS 'Flattens legacy nested shortFormMetadata structure into top-level fields';

-- Step 2: Migrate video resources with short-form metadata to 'short-video' type
-- Uses CTE to pre-compute flattened metadata before updating
WITH to_migrate AS (
  SELECT
    id,
    flatten_short_form_metadata(metadata) AS flattened_meta
  FROM resources
  WHERE type = 'video'
    AND metadata->>'shortFormPlatform' IS NOT NULL
)
UPDATE resources r
SET
  type = 'short-video',
  metadata = tm.flattened_meta
FROM to_migrate tm
WHERE r.id = tm.id;

-- Step 3: Remove legacy keys from ALL resources (cleanup any remnants)
-- This ensures no resources have the old nested structure
UPDATE resources
SET metadata = metadata - 'shortFormPlatform' - 'shortFormMetadata'
WHERE metadata ? 'shortFormPlatform' OR metadata ? 'shortFormMetadata';

-- Step 4: Create partial index for efficient platform filtering
-- Only indexes short-video resources since platform is only meaningful for them
CREATE INDEX IF NOT EXISTS idx_resources_short_video_platform
  ON resources ((metadata->>'platform'))
  WHERE type = 'short-video';

COMMENT ON INDEX idx_resources_short_video_platform IS 'Partial index for filtering short-video resources by platform';

-- Step 5: Validation and logging
-- Outputs migration statistics for operator verification
DO $$
DECLARE
  migrated_count integer;
  remaining_shortform integer;
  platform_counts jsonb;
BEGIN
  -- Count total short-video resources
  SELECT COUNT(*) INTO migrated_count
  FROM resources
  WHERE type = 'short-video';

  -- Check for any remaining video resources with short-form metadata (should be 0)
  SELECT COUNT(*) INTO remaining_shortform
  FROM resources
  WHERE type = 'video'
    AND (metadata ? 'shortFormPlatform' OR metadata ? 'shortFormMetadata');

  -- Get platform breakdown for validation
  SELECT jsonb_object_agg(platform, count)
  INTO platform_counts
  FROM (
    SELECT
      COALESCE(metadata->>'platform', 'unknown') AS platform,
      COUNT(*) AS count
    FROM resources
    WHERE type = 'short-video'
    GROUP BY metadata->>'platform'
  ) platform_summary;

  -- Log migration results
  RAISE NOTICE 'Migration complete: % resources converted to short-video type', migrated_count;
  RAISE NOTICE 'Platform breakdown: %', platform_counts;
  RAISE NOTICE 'Remaining videos with short-form metadata (should be 0): %', remaining_shortform;

  -- Safety check: ensure no data loss occurred
  IF remaining_shortform > 0 THEN
    RAISE WARNING 'Found % video resources still containing short-form metadata. Manual review recommended.', remaining_shortform;
  END IF;
END;
$$;

COMMIT;

-- Validation Queries (run manually after migration):
--
-- 1. Verify no legacy keys remain:
-- SELECT id, type, metadata FROM resources WHERE metadata ? 'shortFormPlatform' OR metadata ? 'shortFormMetadata';
-- Expected: 0 rows
--
-- 2. Check flattened metadata structure:
-- SELECT id, type, metadata->'platform', metadata->'channelName', metadata->'handle'
-- FROM resources WHERE type = 'short-video' LIMIT 5;
--
-- 3. Verify index created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'resources' AND indexname = 'idx_resources_short_video_platform';
