-- ============================================================================
-- Phase 3 Database Validation - Staleness Detection System
-- ============================================================================
-- Run after: npx supabase db push
-- Purpose: Verify schema, indexes, and data integrity for staleness detection
-- ============================================================================

-- ============================================================================
-- SECTION 1: Schema Validation
-- ============================================================================

-- Check that staleness columns exist with correct types
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'comments'
  AND column_name IN ('is_stale', 'original_quoted_text', 'quoted_text')
ORDER BY ordinal_position;

-- Expected output:
-- is_stale              | boolean | YES | false
-- original_quoted_text  | text    | YES | NULL
-- quoted_text           | text    | YES | NULL

-- ============================================================================
-- SECTION 2: Index Validation
-- ============================================================================

-- Check that stale comments index exists
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'comments'
  AND indexname = 'idx_comments_stale';

-- Expected output:
-- Should show: CREATE INDEX idx_comments_stale ON public.comments
--              USING btree (resource_id, is_stale)
--              WHERE (comment_type = 'selected-text'::text)

-- Check all comments table indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'comments'
ORDER BY indexname;

-- ============================================================================
-- SECTION 3: Data Integrity Checks
-- ============================================================================

-- Count comments by type and stale status
SELECT
  comment_type,
  is_stale,
  COUNT(*) as count
FROM comments
GROUP BY comment_type, is_stale
ORDER BY comment_type, is_stale;

-- Check for selected-text comments without original_quoted_text
-- (New comments should have this, old comments may not)
SELECT
  COUNT(*) FILTER (WHERE original_quoted_text IS NOT NULL) as with_original,
  COUNT(*) FILTER (WHERE original_quoted_text IS NULL) as without_original,
  COUNT(*) as total
FROM comments
WHERE comment_type = 'selected-text';

-- Show sample stale comments with their original vs current text
SELECT
  id,
  created_at,
  comment_type,
  is_stale,
  LEFT(original_quoted_text, 40) as original_text_preview,
  LEFT(quoted_text, 40) as current_text_preview,
  LENGTH(original_quoted_text) as original_length,
  LENGTH(quoted_text) as current_length
FROM comments
WHERE is_stale = true
ORDER BY created_at DESC
LIMIT 10;

-- Check for data consistency issues
-- (Comments that are stale but have no original text preserved)
SELECT
  COUNT(*) as problematic_stale_comments
FROM comments
WHERE is_stale = true
  AND comment_type = 'selected-text'
  AND (original_quoted_text IS NULL OR original_quoted_text = '');

-- Expected: Should be 0 or very low (only old comments)

-- ============================================================================
-- SECTION 4: Offset Validation
-- ============================================================================

-- Check for invalid offsets (should never happen, but verify)
SELECT
  id,
  comment_type,
  start_offset,
  end_offset,
  end_offset - start_offset as length
FROM comments
WHERE comment_type = 'selected-text'
  AND (
    start_offset IS NULL
    OR end_offset IS NULL
    OR start_offset < 0
    OR end_offset <= start_offset
  );

-- Expected: 0 rows (constraint should prevent this)

-- ============================================================================
-- SECTION 5: RLS Policy Validation
-- ============================================================================

-- Check that RLS is enabled on comments table
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'comments';

-- Expected: rowsecurity = true

-- List all RLS policies on comments table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'comments'
ORDER BY policyname;

-- ============================================================================
-- SECTION 6: Performance Check
-- ============================================================================

-- Check index usage (run after some queries in production)
-- This helps verify the stale index is being used
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'comments'
ORDER BY idx_scan DESC;

-- ============================================================================
-- SECTION 7: Summary Statistics
-- ============================================================================

-- Overall comment system health check
SELECT
  'Total Comments' as metric,
  COUNT(*)::text as value
FROM comments
UNION ALL
SELECT
  'Selected-Text Comments',
  COUNT(*)::text
FROM comments
WHERE comment_type = 'selected-text'
UNION ALL
SELECT
  'General Comments',
  COUNT(*)::text
FROM comments
WHERE comment_type = 'general'
UNION ALL
SELECT
  'Stale Comments',
  COUNT(*)::text
FROM comments
WHERE is_stale = true
UNION ALL
SELECT
  'Active Comments',
  COUNT(*)::text
FROM comments
WHERE status = 'active'
UNION ALL
SELECT
  'Resolved Comments',
  COUNT(*)::text
FROM comments
WHERE status = 'resolved'
UNION ALL
SELECT
  'Comments with Original Text',
  COUNT(*)::text
FROM comments
WHERE original_quoted_text IS NOT NULL;

-- ============================================================================
-- SECTION 8: Sample Query Performance Test
-- ============================================================================

-- Test query that should use the stale index
EXPLAIN ANALYZE
SELECT
  c.id,
  c.body,
  c.is_stale,
  c.created_at
FROM comments c
WHERE c.resource_id = (
  SELECT id FROM resources LIMIT 1
)
  AND c.comment_type = 'selected-text'
  AND c.is_stale = true
ORDER BY c.created_at DESC;

-- Expected: Should show "Index Scan using idx_comments_stale" in execution plan

-- ============================================================================
-- END OF VALIDATION QUERIES
-- ============================================================================

-- All checks passed if:
-- 1. Schema columns exist with correct types
-- 2. idx_comments_stale index exists
-- 3. No data integrity issues (problematic_stale_comments = 0)
-- 4. No invalid offsets
-- 5. RLS policies are active
-- 6. Index is being used in queries
