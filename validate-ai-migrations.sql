-- Comprehensive Validation Query for AI Migrations
-- Run this after applying migrations to verify schema changes

-- 1. Verify ai_processing_logs table structure
SELECT
  'ai_processing_logs' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'ai_processing_logs') as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ai_processing_logs') as index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_processing_logs') as policy_count;

-- 2. Verify comments table AI fields
SELECT
  'comments (AI fields)' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'comments'
   AND (column_name LIKE 'ai_%' OR column_name = 'created_by_ai' OR column_name = 'retry_count')) as ai_field_count;

-- 3. List all ai_processing_logs columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_processing_logs'
ORDER BY ordinal_position;

-- 4. List all comments AI columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'comments'
  AND (column_name LIKE 'ai_%' OR column_name = 'created_by_ai' OR column_name = 'retry_count')
ORDER BY ordinal_position;

-- 5. Verify indexes on ai_processing_logs
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ai_processing_logs';

-- 6. Verify RLS policies on ai_processing_logs
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'ai_processing_logs'
ORDER BY policyname;

-- 7. Verify constraints on comments table (AI-related)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'comments'::regclass
  AND conname LIKE '%ai%'
ORDER BY conname;

-- Expected Results Summary:
-- ┌─────────────────────────┬──────────────┬─────────────┬──────────────┐
-- │ table_name              │ column_count │ index_count │ policy_count │
-- ├─────────────────────────┼──────────────┼─────────────┼──────────────┤
-- │ ai_processing_logs      │ 12           │ 5           │ 3            │
-- │ comments (AI fields)    │ 5            │ NULL        │ NULL         │
-- └─────────────────────────┴──────────────┴─────────────┴──────────────┘
