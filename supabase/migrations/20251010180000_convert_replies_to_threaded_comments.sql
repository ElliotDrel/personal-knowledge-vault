-- Migrate replies into threaded comments model
-- Adds inline comment body storage and replaces comment_replies table with self-referencing threading metadata

BEGIN;

-- Add new threading columns and inline comment body
ALTER TABLE comments
  ADD COLUMN body TEXT,
  ADD COLUMN thread_root_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  ADD COLUMN thread_prev_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL;

-- Populate body from the earliest reply per comment (initial comment text)
WITH first_replies AS (
  SELECT DISTINCT ON (comment_id)
    comment_id,
    text,
    created_at
  FROM comment_replies
  ORDER BY comment_id, created_at
)
UPDATE comments AS c
SET body = fr.text
FROM first_replies fr
WHERE c.id = fr.comment_id;

-- Any comments without replies default to placeholder text
UPDATE comments
SET body = '[migrated comment]'
WHERE body IS NULL;

-- Store additional replies as threaded comment rows
WITH ordered_replies AS (
  SELECT
    r.*,
    ROW_NUMBER() OVER (PARTITION BY comment_id ORDER BY created_at, id) AS rn,
    LAG(r.id) OVER (PARTITION BY comment_id ORDER BY created_at, id) AS prev_reply_id
  FROM comment_replies r
),
inserted_replies AS (
  INSERT INTO comments (
    id,
    resource_id,
    user_id,
    comment_type,
    status,
    start_offset,
    end_offset,
    quoted_text,
    is_stale,
    original_quoted_text,
    created_at,
    updated_at,
    resolved_at,
    body,
    thread_root_id,
    thread_prev_comment_id
  )
  SELECT
    r.id,
    c.resource_id,
    r.user_id,
    'general',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    r.created_at,
    r.updated_at,
    NULL,
    r.text,
    c.id,
    NULL
  FROM ordered_replies r
  JOIN comments c ON c.id = r.comment_id
  WHERE r.rn > 1
  RETURNING id
)
UPDATE comments AS reply
SET thread_prev_comment_id = CASE
  WHEN ord.rn = 2 THEN ord.comment_id
  ELSE ord.prev_reply_id
END
FROM ordered_replies ord
WHERE reply.id = ord.id AND ord.rn > 1;

-- Ensure body is required going forward
ALTER TABLE comments
  ALTER COLUMN body SET NOT NULL;

-- Enforce trimmed body text
ALTER TABLE comments
  ADD CONSTRAINT comment_body_not_empty CHECK (LENGTH(TRIM(body)) > 0);

-- Index threading metadata for fast retrieval
CREATE INDEX idx_comments_thread_root ON comments(thread_root_id);
CREATE INDEX idx_comments_thread_prev ON comments(thread_prev_comment_id);

-- Remove comment_replies policies before dropping table
DROP POLICY IF EXISTS "users_view_own_comment_replies" ON comment_replies;
DROP POLICY IF EXISTS "users_create_own_replies" ON comment_replies;
DROP POLICY IF EXISTS "users_update_own_replies" ON comment_replies;
DROP POLICY IF EXISTS "users_delete_own_replies" ON comment_replies;

-- Drop triggers and the table now that data is migrated
DROP TRIGGER IF EXISTS set_comment_replies_updated_at ON comment_replies;
DROP TABLE IF EXISTS comment_replies;

COMMIT;
