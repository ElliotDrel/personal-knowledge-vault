-- Create comments table
-- Supports Google Docs-style commenting with text anchoring and stale detection
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Comment type and status
  comment_type TEXT NOT NULL CHECK (comment_type IN ('selected-text', 'general')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),

  -- For selected-text comments only (nullable, validated by constraint)
  start_offset INTEGER,
  end_offset INTEGER,
  quoted_text TEXT,
  is_stale BOOLEAN DEFAULT false,
  original_quoted_text TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  -- Ensure selected-text comments have required fields
  CONSTRAINT selected_text_requires_offsets CHECK (
    (comment_type = 'general') OR
    (comment_type = 'selected-text' AND
     start_offset IS NOT NULL AND
     end_offset IS NOT NULL AND
     quoted_text IS NOT NULL)
  ),

  -- Ensure offsets are valid
  CONSTRAINT valid_offsets CHECK (
    (comment_type = 'general') OR
    (start_offset >= 0 AND end_offset > start_offset)
  )
);

-- Create indexes for performance
CREATE INDEX idx_comments_resource_user ON comments(resource_id, user_id);
CREATE INDEX idx_comments_status ON comments(resource_id, status);
CREATE INDEX idx_comments_type ON comments(resource_id, comment_type);
CREATE INDEX idx_comments_created_at ON comments(resource_id, created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER set_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE comments IS 'User comments on resource notes with text anchoring support';
COMMENT ON COLUMN comments.comment_type IS 'Type: selected-text (anchored) or general (standalone)';
COMMENT ON COLUMN comments.status IS 'Status: active (visible) or resolved (archived)';
COMMENT ON COLUMN comments.start_offset IS 'Character offset for start of highlighted text (selected-text only)';
COMMENT ON COLUMN comments.end_offset IS 'Character offset for end of highlighted text (selected-text only)';
COMMENT ON COLUMN comments.quoted_text IS 'Current text at offset range (selected-text only)';
COMMENT ON COLUMN comments.is_stale IS 'True if quoted_text changed significantly (>50% different)';
COMMENT ON COLUMN comments.original_quoted_text IS 'Original text before becoming stale (preserved for reference)';
