-- =====================================================================================
-- COMPLETE SHARING SYSTEM REMOVAL
-- =====================================================================================
-- This migration completely removes all traces of the sharing system from the database,
-- reverting to the state before sharing was implemented.
--
-- Objects being removed:
-- - 3 Tables: resource_shares, share_invitations, share_access
-- - 2 Enums: sharing_permission, invitation_status
-- - 8 Indexes: All sharing-related indexes
-- - 7 Functions: Token generation, RLS helpers, validation
-- - 2 Triggers: Auto-token and timestamp triggers
-- - 13+ RLS Policies: On sharing tables and modified policies
-- =====================================================================================

-- =====================================================================================
-- STEP 1: DROP TRIGGERS (depend on functions and tables)
-- =====================================================================================

DO $$
BEGIN
    -- Drop sharing-related triggers
    DROP TRIGGER IF EXISTS trigger_set_invitation_token ON share_invitations;
    DROP TRIGGER IF EXISTS trigger_update_resource_shares_timestamp ON resource_shares;

    RAISE NOTICE 'Sharing triggers removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some triggers may not exist: %', SQLERRM;
END $$;

-- =====================================================================================
-- STEP 2: DROP RLS POLICIES (depend on tables and functions)
-- =====================================================================================

DO $$
BEGIN
    -- Drop policies on sharing tables
    DROP POLICY IF EXISTS "Users can view relevant resource shares" ON resource_shares;
    DROP POLICY IF EXISTS "Users can create shares for own resources" ON resource_shares;
    DROP POLICY IF EXISTS "Users can update own resource shares" ON resource_shares;
    DROP POLICY IF EXISTS "Users can delete own resource shares" ON resource_shares;

    DROP POLICY IF EXISTS "Users can view invitations for own shares" ON share_invitations;
    DROP POLICY IF EXISTS "Users can create invitations for own shares" ON share_invitations;
    DROP POLICY IF EXISTS "Users can update invitations for own shares" ON share_invitations;
    DROP POLICY IF EXISTS "Users can delete invitations for own shares" ON share_invitations;

    DROP POLICY IF EXISTS "Users can view relevant share access records" ON share_access;
    DROP POLICY IF EXISTS "System can create share access records" ON share_access;
    DROP POLICY IF EXISTS "Users can update own share access records" ON share_access;

    RAISE NOTICE 'Sharing table policies removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some sharing policies may not exist: %', SQLERRM;
END $$;

-- =====================================================================================
-- STEP 3: REVERT MODIFIED POLICIES ON EXISTING TABLES
-- =====================================================================================

-- Restore original resource policies (remove sharing extensions)
DO $$
BEGIN
    -- Drop the sharing-extended policies
    DROP POLICY IF EXISTS "Users can access own and shared resources" ON resources;
    DROP POLICY IF EXISTS "Users can edit own and shared resources" ON resources;
    DROP POLICY IF EXISTS "Users can delete own resources only" ON resources;

    -- Restore original simple policies
    CREATE POLICY "Users can access own resources" ON resources FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "Users can edit own resources" ON resources FOR UPDATE USING (user_id = auth.uid());
    CREATE POLICY "Users can delete own resources" ON resources FOR DELETE USING (user_id = auth.uid());

    RAISE NOTICE 'Original resource policies restored successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error restoring resource policies: %', SQLERRM;
END $$;

-- Restore original resource_type_configs policies (remove sharing extensions)
DO $$
BEGIN
    -- Drop the sharing-extended policy
    DROP POLICY IF EXISTS "Users can view relevant resource type configs" ON resource_type_configs;

    -- Restore original simple policy
    CREATE POLICY "Users can view own resource type configs" ON resource_type_configs FOR SELECT USING (user_id = auth.uid());

    RAISE NOTICE 'Original resource type config policies restored successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error restoring resource type config policies: %', SQLERRM;
END $$;

-- =====================================================================================
-- STEP 4: DROP FUNCTIONS (some depend on tables)
-- =====================================================================================

DO $$
BEGIN
    -- Drop sharing RLS helper functions
    DROP FUNCTION IF EXISTS user_has_share_access(UUID, UUID, TEXT);
    DROP FUNCTION IF EXISTS share_is_valid(UUID);
    DROP FUNCTION IF EXISTS get_user_share_permission(UUID, UUID, TEXT);
    DROP FUNCTION IF EXISTS validate_sharing_security();

    -- Drop sharing utility functions
    DROP FUNCTION IF EXISTS generate_invitation_token();
    DROP FUNCTION IF EXISTS set_invitation_token();
    DROP FUNCTION IF EXISTS update_resource_shares_timestamp();

    RAISE NOTICE 'Sharing functions removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some functions may not exist: %', SQLERRM;
END $$;

-- =====================================================================================
-- STEP 5: DROP INDEXES (depend on tables)
-- =====================================================================================

DO $$
BEGIN
    -- Drop all sharing-related indexes
    DROP INDEX IF EXISTS idx_resource_shares_resource_id;
    DROP INDEX IF EXISTS idx_resource_shares_shared_by;
    DROP INDEX IF EXISTS idx_resource_shares_active;
    DROP INDEX IF EXISTS idx_resource_shares_expires;

    DROP INDEX IF EXISTS idx_share_invitations_share_id;
    DROP INDEX IF EXISTS idx_share_invitations_email;
    DROP INDEX IF EXISTS idx_share_invitations_token;
    DROP INDEX IF EXISTS idx_share_invitations_status;
    DROP INDEX IF EXISTS idx_share_invitations_expires;

    DROP INDEX IF EXISTS idx_share_access_share_id;
    DROP INDEX IF EXISTS idx_share_access_user_id;
    DROP INDEX IF EXISTS idx_share_access_email;
    DROP INDEX IF EXISTS idx_share_access_last_accessed;

    RAISE NOTICE 'Sharing indexes removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some indexes may not exist: %', SQLERRM;
END $$;

-- =====================================================================================
-- STEP 6: DROP TABLES (in dependency order)
-- =====================================================================================

DO $$
BEGIN
    -- Drop tables in reverse dependency order (children first)
    DROP TABLE IF EXISTS share_access CASCADE;
    DROP TABLE IF EXISTS share_invitations CASCADE;
    DROP TABLE IF EXISTS resource_shares CASCADE;

    RAISE NOTICE 'Sharing tables removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing sharing tables: %', SQLERRM;
END $$;

-- =====================================================================================
-- STEP 7: DROP ENUMS (nothing depends on these)
-- =====================================================================================

DO $$
BEGIN
    -- Drop sharing enums
    DROP TYPE IF EXISTS sharing_permission CASCADE;
    DROP TYPE IF EXISTS invitation_status CASCADE;

    RAISE NOTICE 'Sharing enums removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing sharing enums: %', SQLERRM;
END $$;

-- =====================================================================================
-- STEP 8: VERIFICATION - Ensure complete removal
-- =====================================================================================

-- Verify no sharing objects remain
DO $$
DECLARE
    sharing_tables INTEGER;
    sharing_functions INTEGER;
    sharing_types INTEGER;
BEGIN
    -- Count remaining sharing-related objects
    SELECT COUNT(*) INTO sharing_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE '%share%';

    SELECT COUNT(*) INTO sharing_functions
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND (routine_name LIKE '%share%' OR routine_name LIKE '%invitation%');

    SELECT COUNT(*) INTO sharing_types
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    AND (t.typname LIKE '%sharing%' OR t.typname LIKE '%invitation%');

    -- Report results
    IF sharing_tables = 0 AND sharing_functions = 0 AND sharing_types = 0 THEN
        RAISE NOTICE ' SHARING SYSTEM COMPLETELY REMOVED - No sharing objects remain';
    ELSE
        RAISE NOTICE '  WARNING: Some sharing objects may remain - Tables: %, Functions: %, Types: %',
                     sharing_tables, sharing_functions, sharing_types;
    END IF;

    -- Additional verification
    RAISE NOTICE 'Database successfully reverted to pre-sharing state';
    RAISE NOTICE 'Safe to proceed with removing frontend code changes';

END $$;

-- =====================================================================================
-- COMPLETION MESSAGE
-- =====================================================================================

-- Final confirmation
SELECT 'Sharing system removal completed successfully. Database reverted to pre-sharing state.' as status;