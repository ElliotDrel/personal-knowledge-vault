-- Add index for efficient querying of stale comments
-- This partial index only includes selected-text comments with is_stale flag
-- for fast filtering when displaying or counting stale comments

CREATE INDEX IF NOT EXISTS idx_comments_stale
  ON comments(resource_id, is_stale)
  WHERE comment_type = 'selected-text';

-- Documentation
COMMENT ON INDEX idx_comments_stale IS 'Partial index for efficient stale comment queries (selected-text only)';
