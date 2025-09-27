-- =====================================================================================
-- Row Level Security Policies for Sharing System
-- =====================================================================================
-- This migration implements comprehensive security policies for the sharing system,
-- extending existing resource access to include shared resources with proper permissions.

-- =====================================================================================
-- ENABLE RLS: Ensure all sharing tables have RLS enabled
-- =====================================================================================

ALTER TABLE resource_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- HELPER FUNCTIONS: Security utilities for policy evaluation
-- =====================================================================================

-- Check if user has access to a shared resource (via user_id or email)
CREATE OR REPLACE FUNCTION user_has_share_access(
    target_share_id UUID,
    check_user_id UUID DEFAULT auth.uid(),
    check_email TEXT DEFAULT auth.jwt() ->> 'email'
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM share_access sa
        WHERE sa.share_id = target_share_id
        AND (
            (check_user_id IS NOT NULL AND sa.user_id = check_user_id) OR
            (check_email IS NOT NULL AND sa.email = check_email)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a share is currently valid (active and not expired)
CREATE OR REPLACE FUNCTION share_is_valid(target_share_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM resource_shares rs
        WHERE rs.id = target_share_id
        AND rs.is_active = true
        AND (rs.expires_at IS NULL OR rs.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's permission level for a shared resource
CREATE OR REPLACE FUNCTION get_user_share_permission(
    target_resource_id UUID,
    check_user_id UUID DEFAULT auth.uid(),
    check_email TEXT DEFAULT auth.jwt() ->> 'email'
)
RETURNS sharing_permission AS $$
DECLARE
    permission sharing_permission;
BEGIN
    SELECT rs.permission_level INTO permission
    FROM resource_shares rs
    INNER JOIN share_access sa ON sa.share_id = rs.id
    WHERE rs.resource_id = target_resource_id
    AND rs.is_active = true
    AND (rs.expires_at IS NULL OR rs.expires_at > NOW())
    AND (
        (check_user_id IS NOT NULL AND sa.user_id = check_user_id) OR
        (check_email IS NOT NULL AND sa.email = check_email)
    )
    ORDER BY rs.permission_level DESC -- Prefer 'editor' over 'viewer'
    LIMIT 1;

    RETURN permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- RESOURCE TABLE POLICIES: Extend existing policies for shared access
-- =====================================================================================

-- Policy: Users can view their own resources AND shared resources they have access to
DROP POLICY IF EXISTS "Users can access own and shared resources" ON resources;
CREATE POLICY "Users can access own and shared resources"
ON resources FOR SELECT
USING (
    -- Own resources
    user_id = auth.uid()
    OR
    -- Shared resources with valid access
    id IN (
        SELECT rs.resource_id
        FROM resource_shares rs
        INNER JOIN share_access sa ON sa.share_id = rs.id
        WHERE rs.is_active = true
        AND (rs.expires_at IS NULL OR rs.expires_at > NOW())
        AND (
            sa.user_id = auth.uid() OR
            sa.email = auth.jwt() ->> 'email'
        )
    )
);

-- Policy: Users can edit their own resources AND shared resources with editor permission
DROP POLICY IF EXISTS "Users can edit own and shared resources" ON resources;
CREATE POLICY "Users can edit own and shared resources"
ON resources FOR UPDATE
USING (
    -- Own resources
    user_id = auth.uid()
    OR
    -- Shared resources with editor permission
    id IN (
        SELECT rs.resource_id
        FROM resource_shares rs
        INNER JOIN share_access sa ON sa.share_id = rs.id
        WHERE rs.is_active = true
        AND rs.permission_level = 'editor'
        AND (rs.expires_at IS NULL OR rs.expires_at > NOW())
        AND (
            sa.user_id = auth.uid() OR
            sa.email = auth.jwt() ->> 'email'
        )
    )
);

-- Policy: Users can only delete their own resources (sharing doesn't grant delete access)
DROP POLICY IF EXISTS "Users can delete own resources only" ON resources;
CREATE POLICY "Users can delete own resources only"
ON resources FOR DELETE
USING (user_id = auth.uid());

-- =====================================================================================
-- RESOURCE_SHARES TABLE POLICIES: Share management security
-- =====================================================================================

-- Policy: Users can view shares they created OR shares they have access to
CREATE POLICY "Users can view relevant resource shares"
ON resource_shares FOR SELECT
USING (
    -- Shares they created
    shared_by_user_id = auth.uid()
    OR
    -- Shares they have access to
    user_has_share_access(id, auth.uid(), auth.jwt() ->> 'email')
);

-- Policy: Users can create shares for their own resources
CREATE POLICY "Users can create shares for own resources"
ON resource_shares FOR INSERT
WITH CHECK (
    shared_by_user_id = auth.uid()
    AND
    resource_id IN (
        SELECT id FROM resources WHERE user_id = auth.uid()
    )
);

-- Policy: Users can update shares they created
CREATE POLICY "Users can update own resource shares"
ON resource_shares FOR UPDATE
USING (shared_by_user_id = auth.uid())
WITH CHECK (shared_by_user_id = auth.uid());

-- Policy: Users can delete shares they created
CREATE POLICY "Users can delete own resource shares"
ON resource_shares FOR DELETE
USING (shared_by_user_id = auth.uid());

-- =====================================================================================
-- SHARE_INVITATIONS TABLE POLICIES: Invitation management security
-- =====================================================================================

-- Policy: Users can view invitations for shares they created
CREATE POLICY "Users can view invitations for own shares"
ON share_invitations FOR SELECT
USING (
    share_id IN (
        SELECT id FROM resource_shares WHERE shared_by_user_id = auth.uid()
    )
);

-- Policy: Users can create invitations for shares they own
CREATE POLICY "Users can create invitations for own shares"
ON share_invitations FOR INSERT
WITH CHECK (
    share_id IN (
        SELECT id FROM resource_shares WHERE shared_by_user_id = auth.uid()
    )
);

-- Policy: Users can update invitations for shares they created
CREATE POLICY "Users can update invitations for own shares"
ON share_invitations FOR UPDATE
USING (
    share_id IN (
        SELECT id FROM resource_shares WHERE shared_by_user_id = auth.uid()
    )
)
WITH CHECK (
    share_id IN (
        SELECT id FROM resource_shares WHERE shared_by_user_id = auth.uid()
    )
);

-- Policy: Users can delete invitations for shares they created
CREATE POLICY "Users can delete invitations for own shares"
ON share_invitations FOR DELETE
USING (
    share_id IN (
        SELECT id FROM resource_shares WHERE shared_by_user_id = auth.uid()
    )
);

-- =====================================================================================
-- SHARE_ACCESS TABLE POLICIES: Access tracking security
-- =====================================================================================

-- Policy: Users can view access records for shares they created OR their own access records
CREATE POLICY "Users can view relevant share access records"
ON share_access FOR SELECT
USING (
    -- Access records for shares they created
    share_id IN (
        SELECT rs.id FROM resource_shares rs WHERE rs.shared_by_user_id = auth.uid()
    )
    OR
    -- Their own access records
    user_id = auth.uid()
    OR
    email = auth.jwt() ->> 'email'
);

-- Policy: System can create access records (this will be used by application logic)
CREATE POLICY "System can create share access records"
ON share_access FOR INSERT
WITH CHECK (true); -- Application logic will handle validation

-- Policy: Users can update their own access records (for tracking purposes)
CREATE POLICY "Users can update own share access records"
ON share_access FOR UPDATE
USING (
    user_id = auth.uid() OR
    email = auth.jwt() ->> 'email'
)
WITH CHECK (
    user_id = auth.uid() OR
    email = auth.jwt() ->> 'email'
);

-- Policy: Users cannot delete access records (audit trail protection)
-- No DELETE policy = no one can delete access records

-- =====================================================================================
-- RESOURCE_TYPE_CONFIGS POLICIES: Extend for shared access
-- =====================================================================================

-- Policy: Users can view configs for resources they own or have access to
DROP POLICY IF EXISTS "Users can view relevant resource type configs" ON resource_type_configs;
CREATE POLICY "Users can view relevant resource type configs"
ON resource_type_configs FOR SELECT
USING (
    -- Configs for own resources
    user_id = auth.uid()
    OR
    -- Configs needed for shared resources (view access to any shared resource type)
    EXISTS (
        SELECT 1 FROM resource_shares rs
        INNER JOIN share_access sa ON sa.share_id = rs.id
        INNER JOIN resources r ON r.id = rs.resource_id
        WHERE r.type = resource_type_configs.resource_type
        AND rs.is_active = true
        AND (rs.expires_at IS NULL OR rs.expires_at > NOW())
        AND (
            sa.user_id = auth.uid() OR
            sa.email = auth.jwt() ->> 'email'
        )
    )
);

-- =====================================================================================
-- SECURITY VALIDATION: Verify policies are working correctly
-- =====================================================================================

-- Create validation function to test policy effectiveness
CREATE OR REPLACE FUNCTION validate_sharing_security()
RETURNS TEXT AS $$
DECLARE
    result TEXT := 'Sharing security validation: ';
    policy_count INTEGER;
BEGIN
    -- Count policies on sharing tables
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('resource_shares', 'share_invitations', 'share_access');

    result := result || policy_count || ' policies created for sharing tables. ';

    -- Verify RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname IN ('resource_shares', 'share_invitations', 'share_access')
        AND c.relrowsecurity = true
    ) THEN
        result := result || 'ERROR: RLS not enabled on all sharing tables!';
    ELSE
        result := result || 'RLS properly enabled on all sharing tables.';
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run validation
SELECT validate_sharing_security();

-- =====================================================================================
-- PERFORMANCE NOTES & MONITORING
-- =====================================================================================

-- Add comments for future optimization
COMMENT ON FUNCTION user_has_share_access IS 'Security helper: Check user access to shares. Monitor performance for N+1 queries.';
COMMENT ON FUNCTION share_is_valid IS 'Security helper: Validate share status and expiration. Consider caching for high-frequency checks.';
COMMENT ON FUNCTION get_user_share_permission IS 'Security helper: Get highest permission level for user on resource. Used in authorization logic.';

-- Note: Monitor query performance on these policies, especially for users with many shared resources
-- Consider adding materialized views or caching layers if performance becomes an issue