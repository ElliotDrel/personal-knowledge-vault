-- Migration: Remove processing cache/idempotency system
-- Description: Drops unique index and force_refresh column to allow multiple jobs per URL
-- Date: 2025-10-09
-- Rationale: Users should be able to reprocess the same URL multiple times without constraints

-- Step 1: Drop the unique index that enforces one job per (user_id, normalized_url)
-- This was preventing duplicate submissions and causing "Failed to create processing job" errors
DROP INDEX IF EXISTS idx_processing_jobs_user_url;

-- Step 2: Drop the force_refresh column (no longer used)
-- This column was part of the cache/refresh system being removed
ALTER TABLE processing_jobs
DROP COLUMN IF EXISTS force_refresh;

-- Add documentation comments
COMMENT ON TABLE processing_jobs IS 'Tracks async processing jobs for short-form video metadata extraction. Multiple jobs per URL are allowed.';
COMMENT ON COLUMN processing_jobs.normalized_url IS 'Canonical URL form. Multiple jobs can exist for the same URL, allowing reprocessing.';

-- Validation queries to run after migration:
-- 1. Verify index dropped:
--    SELECT indexname FROM pg_indexes WHERE tablename = 'processing_jobs' AND indexname = 'idx_processing_jobs_user_url';
--    (Should return 0 rows)
--
-- 2. Verify column dropped:
--    SELECT column_name FROM information_schema.columns WHERE table_name = 'processing_jobs' AND column_name = 'force_refresh';
--    (Should return 0 rows)
--
-- 3. Verify remaining indexes are intact:
--    SELECT indexname FROM pg_indexes WHERE tablename = 'processing_jobs' ORDER BY indexname;
--    (Should show: idx_processing_jobs_platform, idx_processing_jobs_status_created, idx_processing_jobs_updated_at, idx_processing_jobs_user_id, processing_jobs_pkey)
--
-- 4. Test duplicate insertion (should succeed):
--    -- This would have failed before with unique constraint violation
--    -- Now it should succeed, creating multiple jobs for the same URL

-- Note: This migration is intentionally not reversible
-- Re-adding the unique index would fail if duplicate (user_id, normalized_url) pairs exist
-- Re-adding force_refresh column would require a default value and updating all existing rows
