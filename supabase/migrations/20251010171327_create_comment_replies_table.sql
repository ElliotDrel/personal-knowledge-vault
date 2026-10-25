-- Create comment_replies table
-- Supports threaded replies within comments for future collaboration features
CREATE TABLE comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure reply text is not empty
  CONSTRAINT text_not_empty CHECK (LENGTH(TRIM(text)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_comment_replies_comment ON comment_replies(comment_id, created_at ASC);
CREATE INDEX idx_comment_replies_user ON comment_replies(user_id);

-- Add updated_at trigger
CREATE TRIGGER set_comment_replies_updated_at
  BEFORE UPDATE ON comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE comment_replies IS 'Threaded replies within comments (future: collaboration support)';
COMMENT ON COLUMN comment_replies.text IS 'Reply content (markdown supported in future)';
