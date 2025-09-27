-- =====================================================================================
-- Sharing System Schema for Personal Knowledge Storage
-- =====================================================================================
-- This migration adds comprehensive sharing functionality allowing users to share
-- resources with others via email-based invitations with granular permissions.

-- =====================================================================================
-- ENUMS: Define permission levels and status types
-- =====================================================================================

-- Permission levels for shared resources
CREATE TYPE sharing_permission AS ENUM (
    'viewer',    -- Can view resource and notes (read-only)
    'editor'     -- Can view and edit resource content
);

-- Status tracking for email invitations
CREATE TYPE invitation_status AS ENUM (
    'pending',   -- Invitation sent, not yet accepted
    'accepted',  -- Recipient has accessed the shared resource
    'expired',   -- Invitation has passed expiration date
    'revoked'    -- Share owner has revoked the invitation
);

-- =====================================================================================
-- CORE TABLES: Sharing system architecture
-- =====================================================================================

-- 1. RESOURCE_SHARES: Central sharing entity
-- Links a resource to sharing configuration and permissions
CREATE TABLE resource_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Sharing configuration
    permission_level sharing_permission NOT NULL DEFAULT 'viewer',
    title TEXT, -- Cached resource title for performance and historical reference
    expires_at TIMESTAMPTZ, -- NULL means no expiration
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- 2. SHARE_INVITATIONS: Email-based invitation tracking
-- Handles the invitation delivery and acceptance process
CREATE TABLE share_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id UUID NOT NULL REFERENCES resource_shares(id) ON DELETE CASCADE,

    -- Recipient information
    email TEXT NOT NULL,
    invitation_token TEXT UNIQUE NOT NULL, -- Secure random token for access

    -- Invitation state
    status invitation_status NOT NULL DEFAULT 'pending',
    message TEXT, -- Optional personal message from sharer

    -- Timestamps
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_token_length CHECK (length(invitation_token) >= 32),
    CONSTRAINT valid_invitation_expiration CHECK (expires_at > invited_at),
    CONSTRAINT accepted_at_logic CHECK (
        (status = 'accepted' AND accepted_at IS NOT NULL) OR
        (status != 'accepted' AND accepted_at IS NULL)
    )
);

-- 3. SHARE_ACCESS: Access tracking and analytics
-- Records actual access to shared resources for analytics and security
CREATE TABLE share_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    share_id UUID NOT NULL REFERENCES resource_shares(id) ON DELETE CASCADE,

    -- Accessor information (user_id for registered, email for unregistered)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,

    -- Access tracking
    first_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 1 CHECK (access_count > 0),

    -- User agent and IP for security (optional fields for privacy)
    user_agent TEXT,
    ip_address INET,

    -- Constraint: must have either user_id or email
    CONSTRAINT valid_accessor CHECK (
        (user_id IS NOT NULL) OR (email IS NOT NULL AND email != '')
    )
);

-- =====================================================================================
-- INDEXES: Optimize for common query patterns
-- =====================================================================================

-- Resource shares indexes
CREATE INDEX idx_resource_shares_resource_id ON resource_shares(resource_id);
CREATE INDEX idx_resource_shares_shared_by ON resource_shares(shared_by_user_id);
CREATE INDEX idx_resource_shares_active ON resource_shares(is_active) WHERE is_active = true;
CREATE INDEX idx_resource_shares_expires ON resource_shares(expires_at) WHERE expires_at IS NOT NULL;

-- Share invitations indexes
CREATE INDEX idx_share_invitations_share_id ON share_invitations(share_id);
CREATE INDEX idx_share_invitations_email ON share_invitations(email);
CREATE INDEX idx_share_invitations_token ON share_invitations(invitation_token);
CREATE INDEX idx_share_invitations_status ON share_invitations(status);
CREATE INDEX idx_share_invitations_expires ON share_invitations(expires_at);

-- Share access indexes
CREATE INDEX idx_share_access_share_id ON share_access(share_id);
CREATE INDEX idx_share_access_user_id ON share_access(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_share_access_email ON share_access(email);
CREATE INDEX idx_share_access_last_accessed ON share_access(last_accessed_at);

-- =====================================================================================
-- FUNCTIONS: Utility functions for sharing system
-- =====================================================================================

-- Generate secure random token for invitations
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    -- Generate 32-byte (256-bit) random token, encoded as URL-safe base64
    RETURN encode(gen_random_bytes(32), 'base64')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically set invitation token on insert
CREATE OR REPLACE FUNCTION set_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invitation_token IS NULL OR NEW.invitation_token = '' THEN
        NEW.invitation_token := generate_invitation_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps on resource_shares
CREATE OR REPLACE FUNCTION update_resource_shares_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGERS: Automated behavior
-- =====================================================================================

-- Auto-generate invitation tokens
CREATE TRIGGER trigger_set_invitation_token
    BEFORE INSERT ON share_invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_token();

-- Auto-update timestamps on resource_shares
CREATE TRIGGER trigger_update_resource_shares_timestamp
    BEFORE UPDATE ON resource_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_shares_timestamp();

-- =====================================================================================
-- INITIAL DATA: Setup default configurations
-- =====================================================================================

-- Add helpful comments for documentation
COMMENT ON TABLE resource_shares IS 'Central sharing configuration linking resources to permissions and expiration settings';
COMMENT ON TABLE share_invitations IS 'Email-based invitations with secure tokens for accessing shared resources';
COMMENT ON TABLE share_access IS 'Access tracking and analytics for shared resources';

COMMENT ON TYPE sharing_permission IS 'Permission levels: viewer (read-only) or editor (read-write)';
COMMENT ON TYPE invitation_status IS 'Invitation lifecycle: pending -> accepted/expired/revoked';

-- =====================================================================================
-- VERIFICATION: Ensure schema is properly created
-- =====================================================================================

-- Verify all tables exist
DO $$
BEGIN
    ASSERT (SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('resource_shares', 'share_invitations', 'share_access')
            AND table_schema = 'public') = 3,
           'Not all sharing tables were created successfully';

    RAISE NOTICE 'Sharing schema created successfully with % tables',
                 (SELECT COUNT(*) FROM information_schema.tables
                  WHERE table_name LIKE '%share%' AND table_schema = 'public');
END $$;