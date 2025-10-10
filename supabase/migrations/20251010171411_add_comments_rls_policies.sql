-- Enable RLS on both tables
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

-- ========================================
-- COMMENTS TABLE POLICIES
-- ========================================

-- SELECT: Users can view their own comments
CREATE POLICY "users_view_own_comments"
  ON comments FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can create comments on their own resources
CREATE POLICY "users_create_own_comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM resources
      WHERE id = resource_id
        AND user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own comments
CREATE POLICY "users_update_own_comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own comments
CREATE POLICY "users_delete_own_comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- COMMENT REPLIES TABLE POLICIES
-- ========================================

-- SELECT: Users can view replies to their own comments
CREATE POLICY "users_view_own_comment_replies"
  ON comment_replies FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM comments WHERE id = comment_id
    )
  );

-- INSERT: Users can create replies on their own comments
CREATE POLICY "users_create_own_replies"
  ON comment_replies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM comments
      WHERE id = comment_id
        AND user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own replies
CREATE POLICY "users_update_own_replies"
  ON comment_replies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own replies
CREATE POLICY "users_delete_own_replies"
  ON comment_replies FOR DELETE
  USING (auth.uid() = user_id);
