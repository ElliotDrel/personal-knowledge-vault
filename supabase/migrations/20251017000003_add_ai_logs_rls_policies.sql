-- Migration: Add RLS policies for ai_processing_logs table
-- Date: 2025-10-17
-- Description: Row-level security policies for ai_processing_logs table.
--              Users can view their own logs. Service role (Edge Functions) can create/update logs.
--              No DELETE policy - audit trail preservation.

-- Enable RLS on ai_processing_logs
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own logs
CREATE POLICY "users_view_own_ai_logs"
  ON ai_processing_logs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Service role can create logs (Edge Functions use service role)
CREATE POLICY "service_role_insert_ai_logs"
  ON ai_processing_logs FOR INSERT
  WITH CHECK (true);

-- UPDATE: Service role can update logs (to set completion status, errors, etc.)
CREATE POLICY "service_role_update_ai_logs"
  ON ai_processing_logs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Note: No DELETE policy defined - logs are permanent for audit trail preservation
-- If cleanup is needed, it should be done via scheduled database maintenance, not user/service actions

-- Validation query (run after migration to verify):
-- SELECT COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE tablename = 'ai_processing_logs';
--
-- Expected: 3 policies (SELECT for users, INSERT/UPDATE for service role)
--
-- Verify policy operations:
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'ai_processing_logs'
-- ORDER BY policyname;
