# Notes Commenting System – Implementation Plan

## Overview & Strategy

- **Goal**: Implement Google Docs-style commenting system for notes with text-anchored and general comments, resolution workflow, and stale detection.
- **Approach**: Execute database migrations, create component architecture, implement text tracking utilities, and integrate with existing NotesEditorDialog in coordinated phases.
- **Guiding principles**: Non-blocking operations, graceful degradation, future-ready schema, type-safe contracts, and incremental testing after each phase.

## Current Status (2025-10-15)

**IN PROGRESS**: Core commenting functionality is implemented across DB, types, storage adapter, utilities/hooks, and UI. Highlights and resolved modal exist. Remaining work focuses on polish, edge cases, and final QA.

### Project Context
- **Base Feature**: NotesEditorDialog already exists with markdown editing
- **Storage Layer**: Supabase storage adapter pattern established
- **UI Framework**: shadcn/ui components for dialogs, cards, buttons
- **State Management**: React hooks with no global state library

### Prerequisites Verified ✅
- [x] NotesEditorDialog working with markdown editing
- [x] Supabase authentication and RLS configured
- [x] Storage adapter pattern established
- [x] TypeScript strict mode enabled
- [x] shadcn/ui components installed

## Phases & Timeline

| Phase | Focus | Duration | Status | Priority |
|-------|-------|----------|--------|----------|
| 0 | Database schema & migrations | 2-3 hours | ✅ COMPLETE | CRITICAL |
| 1 | TypeScript types & storage adapter | 2-3 hours | ✅ COMPLETE | CRITICAL |
| 2 | Text tracking utilities | 3-4 hours | ✅ COMPLETE | HIGH |
| 3 | Core components (Toolbar, Sidebar, Card) | 4-5 hours | ✅ COMPLETE | HIGH |
| 4 | NotesEditorDialog integration | 3-4 hours | ✅ COMPLETE | HIGH |
| 5 | Highlight rendering & interaction | 3-4 hours | ◐ PARTIAL | HIGH |
| 6 | Resolution modal & workflow | 2-3 hours | ◐ PARTIAL | MEDIUM |
| 7 | ResourceDetail badge integration | 1-2 hours | ❌ PENDING | MEDIUM |
| 8 | Testing & validation | 4-6 hours | ❌ PENDING | CRITICAL |
| 9 | Polish & edge case handling | 2-3 hours | ❌ PENDING | LOW |
| **TOTAL** | **Full implementation** | **~30-40 hours** | | **~5-7 days** |

---

## Phase 0 – Database Schema & Migrations (2-3 hours) ✅ CRITICAL

### Objective
Create Supabase tables for `comments` and `comment_replies` with proper RLS policies, indexes, and constraints.

### Prerequisites
- [ ] Working tree clean (commit any pending changes)
- [ ] Supabase CLI installed and linked
- [ ] Database backup taken: `npx supabase db dump --data-only --file backups/pre_comments_$(date +%Y%m%d).sql`

### Step 0.1 – Create Comments Table Migration (30 minutes)

**Files (applied)**: `supabase/migrations/20251010171056_create_comments_table.sql`

Implemented: Comments table with offsets, quoted text, staleness fields, indexes, and updated_at trigger.

**Migration content**:
```sql
-- Create comments table
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
```

**Validation query** (run after migration):
```sql
-- Verify table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

-- Verify constraints
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'comments'::regclass;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'comments';
```

**Expected results**:
- 12 columns (id, resource_id, user_id, comment_type, status, 5 offset fields, 3 timestamps)
- 2 CHECK constraints (selected_text_requires_offsets, valid_offsets)
- 4 indexes (resource_user, status, type, created_at)
- 1 trigger (updated_at)

### Step 0.2 – Initial Replies Table then Migration to Threaded Comments (applied)

An initial `comment_replies` table was created and then migrated to a threaded comments model; replies table has been removed.

**Files (applied)**:
- `supabase/migrations/20251010171327_create_comment_replies_table.sql`
- `supabase/migrations/20251010180000_convert_replies_to_threaded_comments.sql`

Key changes:
- Added inline `body` column to `comments` and enforced `NOT NULL` with `comment_body_not_empty` check.
- Introduced `thread_root_id` and `thread_prev_comment_id` to model replies as comments in a thread.
- Migrated existing replies into threaded `comments` rows and dropped `comment_replies` and its policies/triggers.

### Step 0.3 – Create RLS Policies Migration (30 minutes)

**Files (applied)**: `supabase/migrations/20251010171411_add_comments_rls_policies.sql`

**Migration content**:
```sql
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

-- ========================================
-- VALIDATION QUERIES (run these after migration)
-- ========================================

-- These comments are for documentation; copy to validation file
/*
-- Verify policies created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('comments', 'comment_replies')
ORDER BY tablename, policyname;

-- Test RLS enforcement (replace with actual user ID)
SET ROLE authenticated;
SET request.jwt.claims.sub = '<test-user-uuid>';

-- Should return only own comments
SELECT COUNT(*) FROM comments WHERE user_id = current_setting('request.jwt.claims.sub')::uuid;

-- Should fail (other user's comment)
INSERT INTO comments (resource_id, user_id, comment_type, status)
VALUES ('<some-resource-id>', '<other-user-id>', 'general', 'active');

RESET ROLE;
*/
```

**Validation queries** (run after migration):
```sql
-- Count policies created
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('comments', 'comment_replies');
-- Expected: 8 policies (4 per table)

-- Verify policy names and operations
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('comments', 'comment_replies')
ORDER BY tablename, policyname;
```

**Expected results**:
- 8 total policies (4 for comments, 4 for comment_replies)
- All CRUD operations covered (SELECT, INSERT, UPDATE, DELETE)
- `auth.uid()` used in all policies
- Foreign key validation in INSERT policies

### Step 0.4 – Apply Migrations (10 minutes)

**Commands**:
```bash
# Apply all migrations
npx supabase db push

# Verify migrations applied
npx supabase migration list

# Regenerate TypeScript types
npx supabase gen types typescript --linked > src/types/supabase-generated.ts
```

**Success checks (achieved)**:
- [x] Migrations applied, including threaded conversion
- [x] `supabase-generated.ts` contains updated `comments` types (no `comment_replies`)
- [x] No errors in Supabase dashboard logs
- [x] Tables visible in Supabase Table Editor

**Validation** (run in Supabase SQL Editor):
```sql
-- Final comprehensive check
SELECT
  'comments' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'comments') as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'comments') as index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'comments') as policy_count
UNION ALL
SELECT
  'comment_replies' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'comment_replies') as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'comment_replies') as index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'comment_replies') as policy_count;
```

**Expected output**:
```
table_name       | column_count | index_count | policy_count
-----------------|--------------|-------------|-------------
comments         | 12           | 4           | 4
comment_replies  | 5            | 2           | 4
```

### Rollback Strategy for Phase 0

**If migrations fail or need reverting**:

**Option 1 – Supabase Migration Repair** (Clean rollback):
```bash
# Mark migrations as unapplied (doesn't change data)
npx supabase migration repair <migration-version> --status reverted

# Drop tables manually if created
npx supabase db reset # WARNING: Drops all data
```

**Option 2 – Manual Cleanup** (Safe for production):
```sql
-- Drop tables (CASCADE removes dependencies)
DROP TABLE IF EXISTS comment_replies CASCADE;
DROP TABLE IF EXISTS comments CASCADE;

-- Verify cleanup
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'comment%';
-- Should return 0 rows
```

**Option 3 – Restore from Backup**:
```bash
# Restore pre-migration backup
psql $DATABASE_URL < backups/pre_comments_YYYYMMDD.sql
```

---

## Phase 1 – TypeScript Types & Storage Adapter (2-3 hours) ✅ CRITICAL

### Objective
Define TypeScript interfaces for comments and implement storage adapter methods for CRUD operations.

### Step 1.1 – Create Comment Type Definitions (20 minutes)

**File (implemented)**: `src/types/comments.ts`

**Implementation**:
```typescript
/**
 * Comment Types & Interfaces
 *
 * Defines the data structures for the notes commenting system.
 * Supports two comment types:
 * - selected-text: Anchored to specific text ranges
 * - general: Standalone annotations
 */

export type CommentType = 'selected-text' | 'general';
export type CommentStatus = 'active' | 'resolved';

/**
 * Base comment structure (matches database schema)
 */
export interface Comment {
  id: string;
  resourceId: string;
  userId: string;
  commentType: CommentType;
  status: CommentStatus;

  // Selected-text fields (required when commentType === 'selected-text')
  startOffset?: number;
  endOffset?: number;
  quotedText?: string;
  isStale?: boolean;
  originalQuotedText?: string;

  // Timestamps
  createdAt: string; // ISO 8601
  updatedAt: string;
  resolvedAt?: string;
}

/**
 * Comment reply structure (threaded within comments)
 */
export interface CommentReply {
  id: string;
  commentId: string;
  userId: string;
  text: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

/**
 * Comment with replies pre-loaded (for UI rendering)
 */
export interface CommentWithReplies extends Comment {
  replies: CommentReply[];
}

/**
 * Input for creating new comments
 */
export interface CreateCommentInput {
  resourceId: string;
  commentType: CommentType;
  startOffset?: number;
  endOffset?: number;
  quotedText?: string;
  initialReplyText: string; // First reply is the comment itself
}

/**
 * Input for updating existing comments
 */
export interface UpdateCommentInput {
  quotedText?: string;
  isStale?: boolean;
  originalQuotedText?: string;
  status?: CommentStatus;
  resolvedAt?: string;
}

/**
 * UI state for active comment highlighting
 */
export interface ActiveCommentState {
  commentId: string | null;
  highlightDarker: boolean;
}
```

**Type guards** (add to same file):
```typescript
/**
 * Type guard: Check if comment is selected-text type
 */
export function isSelectedTextComment(comment: Comment): boolean {
  return comment.commentType === 'selected-text' &&
         comment.startOffset !== undefined &&
         comment.endOffset !== undefined &&
         comment.quotedText !== undefined;
}

/**
 * Type guard: Check if comment is active (not resolved)
 */
export function isActiveComment(comment: Comment): boolean {
  return comment.status === 'active';
}
```

**Success check**: TypeScript compiles without errors, types usable in editor autocomplete.

### Step 1.2 – Extend Storage Adapter Interface (30 minutes)

**File (implemented)**: `src/data/storageAdapter.ts`

**Location**: Add `CommentAdapter` interface after `ResourceAdapter`

**Interface definition**:
```typescript
import type {
  Comment,
  CommentReply,
  CommentWithReplies,
  CreateCommentInput,
  UpdateCommentInput,
  CommentStatus
} from '@/types/comments';

/**
 * Storage adapter interface for comment operations
 * Follows same pattern as ResourceAdapter for consistency
 */
export interface CommentAdapter {
  // Read operations
  getComments(resourceId: string, status?: CommentStatus): Promise<CommentWithReplies[]>;
  getComment(commentId: string): Promise<CommentWithReplies>;
  getUnresolvedCount(resourceId: string): Promise<number>;

  // Create operations
  createComment(input: CreateCommentInput): Promise<CommentWithReplies>;
  addReply(commentId: string, text: string): Promise<CommentReply>;

  // Update operations
  updateComment(commentId: string, updates: UpdateCommentInput): Promise<Comment>;
  resolveComment(commentId: string): Promise<Comment>;
  markAsStale(commentId: string, newQuotedText: string): Promise<Comment>;

  // Delete operations
  deleteComment(commentId: string): Promise<void>;
  deleteReply(replyId: string): Promise<void>;
}

/**
 * Combined storage adapter (extend existing interface)
 */
export interface StorageAdapter extends ResourceAdapter, CommentAdapter {
  // Existing methods...
}
```

**Success check**: Interface compiles, no errors from existing storage adapter usage.

### Step 1.3 – Implement Supabase Comment Adapter (60 minutes)

**File (implemented)**: `src/data/supabaseStorage.ts`

**Location**: Add methods to `SupabaseStorage` class

**Helper functions** (add at top of class):
```typescript
/**
 * Map database comment row to Comment type
 */
private mapToComment(row: any): Comment {
  return {
    id: row.id,
    resourceId: row.resource_id,
    userId: row.user_id,
    commentType: row.comment_type,
    status: row.status,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    quotedText: row.quoted_text,
    isStale: row.is_stale,
    originalQuotedText: row.original_quoted_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

/**
 * Map database reply row to CommentReply type
 */
private mapToCommentReply(row: any): CommentReply {
  return {
    id: row.id,
    commentId: row.comment_id,
    userId: row.user_id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map comment with replies to CommentWithReplies type
 */
private mapToCommentWithReplies(row: any): CommentWithReplies {
  const comment = this.mapToComment(row);
  return {
    ...comment,
    replies: (row.replies || []).map((r: any) => this.mapToCommentReply(r)),
  };
}
```

**Core methods implementation**:
```typescript
/**
 * Get comments for a resource (with replies)
 */
async getComments(
  resourceId: string,
  status?: CommentStatus
): Promise<CommentWithReplies[]> {
  const user = await this.getCurrentUser();

  let query = this.supabase
    .from('comments')
    .select(`
      *,
      replies:comment_replies(*)
    `)
    .eq('resource_id', resourceId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[SupabaseStorage] Error fetching comments:', error);
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  // Sort replies within each comment
  return data.map(comment => {
    const mapped = this.mapToCommentWithReplies(comment);
    mapped.replies.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return mapped;
  });
}

/**
 * Get single comment by ID (with replies)
 */
async getComment(commentId: string): Promise<CommentWithReplies> {
  const user = await this.getCurrentUser();

  const { data, error } = await this.supabase
    .from('comments')
    .select(`
      *,
      replies:comment_replies(*)
    `)
    .eq('id', commentId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('[SupabaseStorage] Error fetching comment:', error);
    throw new Error(`Failed to fetch comment: ${error.message}`);
  }

  return this.mapToCommentWithReplies(data);
}

/**
 * Count unresolved comments for a resource
 */
async getUnresolvedCount(resourceId: string): Promise<number> {
  const user = await this.getCurrentUser();

  const { count, error } = await this.supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('resource_id', resourceId)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    console.error('[SupabaseStorage] Error counting comments:', error);
    return 0; // Graceful degradation
  }

  return count || 0;
}

/**
 * Create new comment with initial reply
 */
async createComment(input: CreateCommentInput): Promise<CommentWithReplies> {
  const user = await this.getCurrentUser();

  // Step 1: Create comment
  const { data: comment, error: commentError } = await this.supabase
    .from('comments')
    .insert({
      resource_id: input.resourceId,
      user_id: user.id,
      comment_type: input.commentType,
      status: 'active',
      start_offset: input.startOffset,
      end_offset: input.endOffset,
      quoted_text: input.quotedText,
    })
    .select()
    .single();

  if (commentError) {
    console.error('[SupabaseStorage] Error creating comment:', commentError);
    throw new Error(`Failed to create comment: ${commentError.message}`);
  }

  // Step 2: Create initial reply
  const { data: reply, error: replyError } = await this.supabase
    .from('comment_replies')
    .insert({
      comment_id: comment.id,
      user_id: user.id,
      text: input.initialReplyText,
    })
    .select()
    .single();

  if (replyError) {
    console.error('[SupabaseStorage] Error creating initial reply:', replyError);
    // Try to clean up orphaned comment
    await this.deleteComment(comment.id).catch(() => {});
    throw new Error(`Failed to create comment reply: ${replyError.message}`);
  }

  return {
    ...this.mapToComment(comment),
    replies: [this.mapToCommentReply(reply)],
  };
}

/**
 * Add reply to existing comment
 */
async addReply(commentId: string, text: string): Promise<CommentReply> {
  const user = await this.getCurrentUser();

  // Verify comment exists and user owns it
  const comment = await this.getComment(commentId);
  if (comment.userId !== user.id) {
    throw new Error('Cannot add reply to comment owned by another user');
  }

  const { data, error } = await this.supabase
    .from('comment_replies')
    .insert({
      comment_id: commentId,
      user_id: user.id,
      text: text.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('[SupabaseStorage] Error adding reply:', error);
    throw new Error(`Failed to add reply: ${error.message}`);
  }

  return this.mapToCommentReply(data);
}

/**
 * Update comment fields
 */
async updateComment(
  commentId: string,
  updates: UpdateCommentInput
): Promise<Comment> {
  const user = await this.getCurrentUser();

  const { data, error } = await this.supabase
    .from('comments')
    .update(updates)
    .eq('id', commentId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[SupabaseStorage] Error updating comment:', error);
    throw new Error(`Failed to update comment: ${error.message}`);
  }

  return this.mapToComment(data);
}

/**
 * Mark comment as resolved
 */
async resolveComment(commentId: string): Promise<Comment> {
  return this.updateComment(commentId, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  });
}

/**
 * Mark comment as stale (text changed significantly)
 */
async markAsStale(commentId: string, newQuotedText: string): Promise<Comment> {
  const comment = await this.getComment(commentId);

  return this.updateComment(commentId, {
    isStale: true,
    originalQuotedText: comment.originalQuotedText || comment.quotedText,
    quotedText: newQuotedText,
  });
}

/**
 * Permanently delete comment (and all replies via CASCADE)
 */
async deleteComment(commentId: string): Promise<void> {
  const user = await this.getCurrentUser();

  const { error } = await this.supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[SupabaseStorage] Error deleting comment:', error);
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

/**
 * Delete single reply
 */
async deleteReply(replyId: string): Promise<void> {
  const user = await this.getCurrentUser();

  const { error } = await this.supabase
    .from('comment_replies')
    .delete()
    .eq('id', replyId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[SupabaseStorage] Error deleting reply:', error);
    throw new Error(`Failed to delete reply: ${error.message}`);
  }
}
```

**Success checks**:
- [ ] TypeScript compiles without errors
- [ ] All methods return correct types
- [ ] Error handling in place for all database operations
- [ ] User ID filtering applied to all queries (RLS enforcement)

### Step 1.4 – Update Storage Adapter Hook (15 minutes)

**File**: `src/data/storageAdapter.ts`

**Location**: Update `useStorageAdapter()` hook return type

**Change**:
```typescript
export function useStorageAdapter(): StorageAdapter {
  // Existing logic...
  return storage; // Now includes CommentAdapter methods
}
```

**File**: `src/data/storage.ts` (if localStorage implementation exists)

**Add stub methods** (to prevent type errors):
```typescript
// In LocalStorage class, add stub comment methods that throw
async getComments(): Promise<CommentWithReplies[]> {
  throw new Error('Comments not supported in localStorage mode');
}

async getUnresolvedCount(): Promise<number> {
  return 0; // Graceful degradation
}

// ... other methods as stubs
```

**Success check**: Hook usage in components shows new comment methods in autocomplete.

### Rollback Strategy for Phase 1

**If types or adapter have issues**:

1. **Revert type file**:
```bash
git checkout HEAD -- src/types/comments.ts
rm src/types/comments.ts # if newly created
```

2. **Revert storage adapter changes**:
```bash
git checkout HEAD -- src/data/supabaseStorage.ts
git checkout HEAD -- src/data/storageAdapter.ts
```

3. **Verify app still runs**:
```bash
npm run dev
# Should work without comment features
```

---

## Phase 2 – Text Tracking Utilities (3-4 hours) ✅ HIGH

### Objective
Implement character offset tracking, similarity detection, and stale comment logic.

### Step 2.1 – Create Text Tracking Utility File (90 minutes)

**File**: `src/utils/commentTextTracking.ts` (NEW)

**Implementation**:
```typescript
/**
 * Comment Text Tracking Utilities
 *
 * Handles character offset calculations, text similarity detection,
 * and stale comment identification when underlying text changes.
 */

import type { Comment } from '@/types/comments';

/**
 * Calculate simple character-based similarity between two strings
 * Returns value between 0 (completely different) and 1 (identical)
 *
 * Algorithm: Count matching characters in order, divide by longer string length
 * Fast and "good enough" for comment staleness detection.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  // Count matching characters in sequence
  let matches = 0;
  let shorterIndex = 0;

  for (let i = 0; i < longer.length && shorterIndex < shorter.length; i++) {
    if (longer[i] === shorter[shorterIndex]) {
      matches++;
      shorterIndex++;
    }
  }

  return matches / longer.length;
}

/**
 * Check if comment text has changed enough to mark as stale
 *
 * @param text - Current full text content
 * @param comment - Comment to check
 * @returns Object with isStale flag and current text at offset range
 */
export function checkCommentStale(
  text: string,
  comment: Comment
): { isStale: boolean; currentText: string } {
  // General comments can't be stale (no text anchor)
  if (comment.commentType !== 'selected-text') {
    return { isStale: false, currentText: '' };
  }

  const { startOffset, endOffset, quotedText } = comment;

  // Safety checks
  if (
    startOffset === undefined ||
    endOffset === undefined ||
    !quotedText
  ) {
    return { isStale: false, currentText: '' };
  }

  // Extract current text at offset range
  const currentText = text.slice(startOffset, endOffset);

  // If identical, definitely not stale
  if (currentText === quotedText) {
    return { isStale: false, currentText };
  }

  // Calculate similarity
  const similarity = calculateSimilarity(currentText, quotedText);

  // Threshold: 50% similarity
  // If less than 50% of characters match, consider stale
  const STALE_THRESHOLD = 0.5;
  const isStale = similarity < STALE_THRESHOLD;

  return { isStale, currentText };
}

/**
 * Recalculate comment offsets after text insertion or deletion
 *
 * @param comments - Array of comments to update
 * @param changeStart - Character offset where change occurred
 * @param changeLength - Length of change (positive for insertion, negative for deletion)
 * @returns Updated comments array with new offsets
 */
export function updateCommentOffsets(
  comments: Comment[],
  changeStart: number,
  changeLength: number
): Comment[] {
  return comments.map(comment => {
    // General comments don't have offsets
    if (comment.commentType !== 'selected-text') {
      return comment;
    }

    const { startOffset, endOffset } = comment;

    if (startOffset === undefined || endOffset === undefined) {
      return comment;
    }

    // Case 1: Change is completely after this comment
    // Example: Comment at [10-20], change at position 50
    // Result: No change needed
    if (changeStart >= endOffset) {
      return comment;
    }

    // Case 2: Change is completely before this comment
    // Example: Comment at [50-60], change at position 10, length +5
    // Result: Shift both offsets right by 5 → [55-65]
    if (changeStart <= startOffset) {
      return {
        ...comment,
        startOffset: Math.max(0, startOffset + changeLength),
        endOffset: Math.max(0, endOffset + changeLength),
      };
    }

    // Case 3: Change is inside this comment
    // Example: Comment at [10-30], user types at position 15, length +3
    // Result: Extend end offset → [10-33]
    if (changeStart > startOffset && changeStart < endOffset) {
      return {
        ...comment,
        endOffset: Math.max(startOffset + 1, endOffset + changeLength),
      };
    }

    // Default: No change (shouldn't reach here, but safety fallback)
    return comment;
  });
}

/**
 * Find where text starts to differ between two strings
 * Used to determine where a text change occurred
 *
 * @param oldText - Previous text
 * @param newText - Current text
 * @returns Character offset where texts first differ
 */
export function findChangeStart(oldText: string, newText: string): number {
  const minLength = Math.min(oldText.length, newText.length);

  for (let i = 0; i < minLength; i++) {
    if (oldText[i] !== newText[i]) {
      return i;
    }
  }

  // If one string is prefix of other, change starts at end of shorter string
  return minLength;
}

/**
 * Calculate the length of a text change
 *
 * @param oldText - Previous text
 * @param newText - Current text
 * @returns Signed integer (positive for insertion, negative for deletion)
 */
export function calculateChangeLength(oldText: string, newText: string): number {
  return newText.length - oldText.length;
}

/**
 * Batch update multiple comments for text changes
 * Combines offset update and stale detection in one pass
 *
 * @param comments - Comments to update
 * @param oldText - Previous full text
 * @param newText - Current full text
 * @returns Updated comments with new offsets and stale flags
 */
export function updateCommentsForTextChange(
  comments: Comment[],
  oldText: string,
  newText: string
): Comment[] {
  // Find where change occurred
  const changeStart = findChangeStart(oldText, newText);
  const changeLength = calculateChangeLength(oldText, newText);

  // Update offsets
  let updatedComments = updateCommentOffsets(comments, changeStart, changeLength);

  // Check for stale comments
  updatedComments = updatedComments.map(comment => {
    const { isStale, currentText } = checkCommentStale(newText, comment);

    // Only update if stale status changed
    if (isStale && !comment.isStale) {
      return {
        ...comment,
        isStale: true,
        originalQuotedText: comment.originalQuotedText || comment.quotedText,
        quotedText: currentText,
      };
    }

    // If recovered from stale (user undid changes)
    if (!isStale && comment.isStale) {
      return {
        ...comment,
        isStale: false,
        quotedText: currentText,
      };
    }

    // Update quoted text even if not stale (keeps in sync)
    if (comment.commentType === 'selected-text' && currentText !== comment.quotedText) {
      return {
        ...comment,
        quotedText: currentText,
      };
    }

    return comment;
  });

  return updatedComments;
}
```

**Unit tests** (optional but recommended):

Create `src/utils/commentTextTracking.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  checkCommentStale,
  updateCommentOffsets,
  findChangeStart,
  calculateChangeLength,
} from './commentTextTracking';

describe('calculateSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(calculateSimilarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(calculateSimilarity('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('handles empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1);
    expect(calculateSimilarity('hello', '')).toBe(0);
  });
});

describe('updateCommentOffsets', () => {
  it('shifts offsets right when inserting before comment', () => {
    const comments = [{
      commentType: 'selected-text',
      startOffset: 50,
      endOffset: 60,
    }] as any[];

    const updated = updateCommentOffsets(comments, 10, 5); // Insert 5 chars at position 10

    expect(updated[0].startOffset).toBe(55);
    expect(updated[0].endOffset).toBe(65);
  });

  it('extends end offset when inserting inside comment', () => {
    const comments = [{
      commentType: 'selected-text',
      startOffset: 10,
      endOffset: 30,
    }] as any[];

    const updated = updateCommentOffsets(comments, 15, 3); // Insert 3 chars at position 15

    expect(updated[0].startOffset).toBe(10);
    expect(updated[0].endOffset).toBe(33);
  });

  it('does not change offsets when inserting after comment', () => {
    const comments = [{
      commentType: 'selected-text',
      startOffset: 10,
      endOffset: 20,
    }] as any[];

    const updated = updateCommentOffsets(comments, 50, 5); // Insert 5 chars at position 50

    expect(updated[0].startOffset).toBe(10);
    expect(updated[0].endOffset).toBe(20);
  });
});

// Add more tests as needed...
```

**Success checks**:
- [ ] All functions compile without errors
- [ ] Unit tests pass (if created)
- [ ] JSDoc comments clear and helpful
- [ ] Functions exported for use in components

### Step 2.2 – Create React Hook for Text Tracking (60 minutes)

**File**: `src/hooks/use-comment-text-tracking.ts` (NEW)

**Implementation**:
```typescript
/**
 * React hook for managing comment text tracking state
 * Handles debounced database updates and real-time offset calculations
 */

import { useEffect, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { Comment, CommentWithReplies } from '@/types/comments';
import { updateCommentsForTextChange } from '@/utils/commentTextTracking';
import { useStorageAdapter } from '@/data/storageAdapter';

interface UseCommentTextTrackingOptions {
  resourceId: string;
  enabled: boolean;
  debounceMs?: number; // Default: 2000ms (2 seconds)
}

/**
 * Hook to manage comment text tracking for a notes editor
 *
 * Usage:
 * const { handleTextChange } = useCommentTextTracking({
 *   resourceId: resource.id,
 *   enabled: true,
 * });
 *
 * // In editor onChange:
 * handleTextChange(oldValue, newValue, localComments, setLocalComments);
 */
export function useCommentTextTracking(options: UseCommentTextTrackingOptions) {
  const { resourceId, enabled, debounceMs = 2000 } = options;
  const storageAdapter = useStorageAdapter();
  const previousTextRef = useRef<string>('');

  /**
   * Debounced function to persist comment updates to database
   */
  const persistCommentUpdates = useDebouncedCallback(
    async (updatedComments: Comment[]) => {
      if (!enabled) return;

      // Only update comments that changed (stale flag or quoted text)
      const commentsToUpdate = updatedComments.filter(comment => {
        // Check if stale flag changed or quoted text updated
        return comment.commentType === 'selected-text';
      });

      // Update each comment in parallel
      await Promise.all(
        commentsToUpdate.map(async comment => {
          try {
            await storageAdapter.updateComment(comment.id, {
              quotedText: comment.quotedText,
              isStale: comment.isStale,
              originalQuotedText: comment.originalQuotedText,
            });
          } catch (error) {
            console.error('[useCommentTextTracking] Error updating comment:', error);
            // Continue with other updates
          }
        })
      );
    },
    debounceMs
  );

  /**
   * Handle text changes and update comment offsets + stale status
   *
   * @param oldText - Previous text content
   * @param newText - New text content
   * @param comments - Current comments array
   * @param setComments - State setter for comments
   */
  const handleTextChange = useCallback(
    (
      oldText: string,
      newText: string,
      comments: CommentWithReplies[],
      setComments: (comments: CommentWithReplies[]) => void
    ) => {
      if (!enabled) return;
      if (oldText === newText) return; // No change

      // Update offsets and check stale status (pure function, fast)
      const updatedComments = updateCommentsForTextChange(
        comments,
        oldText,
        newText
      );

      // Update local state immediately (optimistic UI)
      setComments(updatedComments as CommentWithReplies[]);

      // Persist to database (debounced)
      persistCommentUpdates(updatedComments);

      // Store current text for next comparison
      previousTextRef.current = newText;
    },
    [enabled, persistCommentUpdates]
  );

  return {
    handleTextChange,
  };
}
```

**Install debounce dependency** (if not already installed):
```bash
npm install use-debounce
```

**Success check**: Hook compiles and can be imported in components.

### Step 2.3 – Test Text Tracking Logic (30 minutes)

**Manual testing script** (run in browser console):

```typescript
// Test similarity calculation
import { calculateSimilarity } from '@/utils/commentTextTracking';

console.log(calculateSimilarity('hello world', 'hello world')); // 1
console.log(calculateSimilarity('hello world', 'hello there')); // ~0.5
console.log(calculateSimilarity('hello world', 'completely different')); // <0.5

// Test offset updates
import { updateCommentOffsets } from '@/utils/commentTextTracking';

const testComments = [{
  id: '1',
  commentType: 'selected-text',
  startOffset: 50,
  endOffset: 60,
  quotedText: 'test text',
}];

// Insert 5 chars at position 10 (before comment)
const updated = updateCommentOffsets(testComments, 10, 5);
console.log(updated[0].startOffset); // Should be 55
console.log(updated[0].endOffset); // Should be 65
```

**Success criteria**:
- [ ] Similarity function returns values between 0 and 1
- [ ] Offset updates shift correctly for before/inside/after changes
- [ ] Stale detection triggers at <50% similarity
- [ ] No performance issues with large text (>10,000 chars)

### Rollback Strategy for Phase 2

**If text tracking has bugs**:

1. **Disable text tracking feature**:
```typescript
// In component using text tracking
const ENABLE_TEXT_TRACKING = false; // Feature flag

if (ENABLE_TEXT_TRACKING) {
  handleTextChange(...);
}
```

2. **Revert utility file**:
```bash
git checkout HEAD -- src/utils/commentTextTracking.ts
```

3. **Comments still work**, just offsets won't update (acceptable degradation).

---

## Phase 3 – Core Components (4-5 hours) ✅ HIGH

### Objective
Build CommentToolbar, CommentSidebar, and CommentCard components with full interactivity.

### Step 3.1 – Create CommentToolbar Component (60 minutes)

**File**: `src/components/comments/CommentToolbar.tsx` (NEW)

**Create directory**:
```bash
mkdir -p src/components/comments
```

**Implementation**:
```typescript
/**
 * CommentToolbar Component
 *
 * Displays toolbar above notes editor with comment actions.
 * Shows "Add Comment" button (enabled when text selected) and
 * "View Resolved" button with unresolved count badge.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, Archive } from 'lucide-react';

interface CommentToolbarProps {
  hasSelection: boolean;
  onCreateComment: () => void;
  onViewResolved: () => void;
  unresolvedCount: number;
}

export function CommentToolbar({
  hasSelection,
  onCreateComment,
  onViewResolved,
  unresolvedCount,
}: CommentToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b pb-3 mb-3 px-1">
      {/* Left side - Creation tools */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelection}
          onClick={onCreateComment}
          className="gap-2"
          aria-label="Add comment to selected text"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Add Comment
        </Button>

        {/* Future tools go here (e.g., formatting buttons, AI tools) */}
      </div>

      {/* Right side - Utility actions */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onViewResolved}
        className="gap-2"
        aria-label={`View resolved comments (${unresolvedCount} unresolved)`}
      >
        <Archive className="w-4 h-4" />
        View Resolved
        {unresolvedCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {unresolvedCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
```

**Styling notes**:
- Border-bottom creates separation from editor
- Left-aligned tools (Add Comment) with right-aligned utilities (View Resolved)
- Badge only shows when count > 0
- Disabled state clear (grey button, no hover)

**Success check**: Component renders without errors, buttons clickable.

### Step 3.2 – Create CommentCard Component (90 minutes)

**File**: `src/components/comments/CommentCard.tsx` (NEW)

**Implementation**:
```typescript
/**
 * CommentCard Component
 *
 * Displays individual comment with replies, resolution button,
 * and reply input. Handles both new comment creation and
 * existing comment display.
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, MessageCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { CommentWithReplies } from '@/types/comments';

interface CommentCardProps {
  comment: CommentWithReplies | null; // null for new comment creation
  isNew?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  onResolve?: () => void;
  onAddReply?: (text: string) => Promise<void>;
  onDeleteReply?: (replyId: string) => Promise<void>;
  onSubmit?: (text: string) => Promise<void>; // for new comments
  onCancel?: () => void; // for new comments
}

export function CommentCard({
  comment,
  isNew = false,
  isActive = false,
  onClick,
  onResolve,
  onAddReply,
  onDeleteReply,
  onSubmit,
  onCancel,
}: CommentCardProps) {
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when creating new comment
  useEffect(() => {
    if (isNew && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isNew]);

  /**
   * Handle submitting new comment or reply
   */
  const handleSubmit = async () => {
    const trimmed = replyText.trim();

    if (!trimmed) {
      // Don't allow empty submissions
      return;
    }

    setIsSubmitting(true);

    try {
      if (isNew && onSubmit) {
        // Creating new comment
        await onSubmit(trimmed);
      } else if (onAddReply) {
        // Adding reply to existing comment
        await onAddReply(trimmed);
        setShowReplyInput(false);
      }

      // Clear input on success
      setReplyText('');
    } catch (error) {
      console.error('[CommentCard] Error submitting:', error);
      // Error handled by parent, keep input visible for retry
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    if (isNew && onCancel) {
      // If user typed something, warn before canceling
      if (replyText.trim()) {
        const confirm = window.confirm(
          'Discard this comment? Your text will be lost.'
        );
        if (!confirm) return;
      }

      onCancel();
    } else {
      // Hide reply input
      setShowReplyInput(false);
      setReplyText('');
    }
  };

  /**
   * Handle Enter key to submit (Ctrl+Enter or Cmd+Enter)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        isActive && 'ring-2 ring-primary shadow-lg',
        comment?.isStale && 'border-orange-400',
        !isNew && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Show quoted text for selected-text comments */}
            {comment?.commentType === 'selected-text' && comment.quotedText && (
              <p className="text-xs text-muted-foreground mb-1 line-clamp-2 italic">
                "{comment.quotedText}"
              </p>
            )}

            {/* Show stale warning */}
            {comment?.isStale && (
              <Badge variant="warning" className="text-xs mb-2">
                ⚠ Stale - text changed
              </Badge>
            )}

            {/* Comment type badge */}
            {comment?.commentType === 'general' && (
              <Badge variant="secondary" className="text-xs mb-2">
                General
              </Badge>
            )}
          </div>

          {/* Resolve button for existing comments */}
          {!isNew && onResolve && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onResolve();
              }}
              aria-label="Resolve comment"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Existing replies */}
        {comment?.replies.map((reply) => (
          <div key={reply.id} className="text-sm space-y-1">
            <p className="whitespace-pre-wrap leading-relaxed">{reply.text}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(reply.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        ))}

        {/* New comment input (creating) */}
        {isNew && (
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your comment... (Ctrl+Enter to submit)"
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!replyText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Comment'
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Reply input for existing comments */}
        {!isNew && showReplyInput && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              ref={textareaRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a reply..."
              rows={2}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!replyText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Replying...
                  </>
                ) : (
                  'Reply'
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Reply button for existing comments */}
        {!isNew && !showReplyInput && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setShowReplyInput(true);
              // Focus textarea after render
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            className="gap-1"
          >
            <MessageCircle className="w-3 h-3" />
            Reply
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

**Success checks**:
- [ ] Component renders for both new and existing comments
- [ ] Reply input shows/hides correctly
- [ ] Submit button disabled when text empty
- [ ] Ctrl+Enter submits comment
- [ ] Cancel button shows confirmation if text entered

### Step 3.3 – Create CommentSidebar Component (60 minutes)

**File**: `src/components/comments/CommentSidebar.tsx` (NEW)

**Implementation**:
```typescript
/**
 * CommentSidebar Component
 *
 * Displays list of active comments with create-new card at top.
 * Scrolls active comment into view when clicked from editor.
 */

import { useEffect, useRef } from 'react';
import { CommentCard } from './CommentCard';
import type { CommentWithReplies } from '@/types/comments';
import { cn } from '@/lib/utils';

interface CommentSidebarProps {
  comments: CommentWithReplies[];
  activeCommentId: string | null;
  onCommentClick: (id: string) => void;
  onResolve: (id: string) => void;
  onAddReply: (commentId: string, text: string) => Promise<void>;
  onDeleteReply: (replyId: string) => Promise<void>;
  isCreatingComment: boolean;
  onCreateCommentSubmit: (text: string) => Promise<void>;
  onCreateCommentCancel: () => void;
}

export function CommentSidebar({
  comments,
  activeCommentId,
  onCommentClick,
  onResolve,
  onAddReply,
  onDeleteReply,
  isCreatingComment,
  onCreateCommentSubmit,
  onCreateCommentCancel,
}: CommentSidebarProps) {
  const activeCommentRef = useRef<HTMLDivElement>(null);

  // Scroll active comment into view when it changes
  useEffect(() => {
    if (activeCommentId && activeCommentRef.current) {
      activeCommentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeCommentId]);

  // Filter to only active comments (resolved shown in modal)
  const activeComments = comments.filter((c) => c.status === 'active');

  return (
    <div
      className={cn(
        'w-[320px] border-l pl-4 space-y-4 overflow-y-auto',
        'flex-shrink-0' // Prevent sidebar from shrinking
      )}
    >
      {/* New comment creation card (top position) */}
      {isCreatingComment && (
        <CommentCard
          comment={null}
          isNew
          onSubmit={onCreateCommentSubmit}
          onCancel={onCreateCommentCancel}
        />
      )}

      {/* Empty state */}
      {activeComments.length === 0 && !isCreatingComment && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>No comments yet</p>
          <p className="text-xs mt-1">Select text to add a comment</p>
        </div>
      )}

      {/* Existing active comments */}
      {activeComments.map((comment) => (
        <div
          key={comment.id}
          ref={comment.id === activeCommentId ? activeCommentRef : null}
        >
          <CommentCard
            comment={comment}
            isActive={comment.id === activeCommentId}
            onClick={() => onCommentClick(comment.id)}
            onResolve={() => onResolve(comment.id)}
            onAddReply={(text) => onAddReply(comment.id, text)}
            onDeleteReply={onDeleteReply}
          />
        </div>
      ))}
    </div>
  );
}
```

**Success checks**:
- [ ] Sidebar renders with fixed 320px width
- [ ] Comments display in chronological order
- [ ] Active comment scrolls into view smoothly
- [ ] Empty state shows when no comments exist

### Rollback Strategy for Phase 3

**If components have issues**:

1. **Comment out component imports**:
```typescript
// In NotesEditorDialog.tsx
// import { CommentToolbar } from '@/components/comments/CommentToolbar';
// ... (comment out usage)
```

2. **Revert component files**:
```bash
rm -rf src/components/comments/
```

3. **Dialog still works** without comment features.

---

## Phase 4 – NotesEditorDialog Integration (3-4 hours) ✅ HIGH

### Objective
Integrate commenting components into NotesEditorDialog with state management and layout changes.

### Step 4.1 – Update NotesEditorDialog Props (15 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: Lines 37-44 (props interface)

**Add new props**:
```typescript
interface NotesEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;

  // NEW: Comment-related props
  resourceId: string; // Required for loading comments
  onCommentCountChange?: (count: number) => void; // Notify parent of count changes
}
```

**Success check**: TypeScript shows new props in autocomplete, no errors.

### Step 4.2 – Add Comment State to NotesEditorDialog (30 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After existing useState declarations (around line 56)

**Add state**:
```typescript
// Existing state...
const [currentValue, setCurrentValue] = useState(initialValue);
const [showConfirmation, setShowConfirmation] = useState(false);

// NEW: Comment state
const [comments, setComments] = useState<CommentWithReplies[]>([]);
const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
const [showResolvedComments, setShowResolvedComments] = useState(false);
const [isCreatingComment, setIsCreatingComment] = useState(false);
const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
const [commentsLoading, setCommentsLoading] = useState(false);

const storageAdapter = useStorageAdapter();
```

**Add imports** (top of file):
```typescript
import type { CommentWithReplies } from '@/types/comments';
import { useStorageAdapter } from '@/data/storageAdapter';
import { useCommentTextTracking } from '@/hooks/use-comment-text-tracking';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import { CommentSidebar } from '@/components/comments/CommentSidebar';
import { ResolvedCommentsModal } from '@/components/comments/ResolvedCommentsModal'; // Phase 6
```

**Success check**: File compiles, no errors from new imports.

### Step 4.3 – Load Comments on Dialog Open (30 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After existing useEffect hooks (around line 78)

**Add effect**:
```typescript
// Load comments when dialog opens
useEffect(() => {
  if (open && resourceId) {
    loadComments();
  }
}, [open, resourceId]);

/**
 * Load active comments from database
 */
const loadComments = async () => {
  setCommentsLoading(true);

  try {
    const loadedComments = await storageAdapter.getComments(resourceId, 'active');
    setComments(loadedComments);

    // Notify parent of unresolved count
    if (onCommentCountChange) {
      onCommentCountChange(loadedComments.length);
    }
  } catch (error) {
    console.error('[NotesEditorDialog] Error loading comments:', error);
    // Graceful degradation: continue without comments
    setComments([]);
  } finally {
    setCommentsLoading(false);
  }
};
```

**Success check**: Opening dialog triggers database query for comments.

### Step 4.4 – Implement Comment Handler Functions (60 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After loadComments function

**Add handlers**:
```typescript
/**
 * Handle starting comment creation flow
 */
const handleStartCommentCreation = () => {
  if (!selectionRange) {
    console.warn('[NotesEditorDialog] No text selected for comment');
    return;
  }

  setIsCreatingComment(true);
};

/**
 * Handle submitting new comment
 */
const handleCreateCommentSubmit = async (text: string) => {
  if (!selectionRange) {
    console.error('[NotesEditorDialog] No selection range for comment');
    return;
  }

  try {
    const quotedText = currentValue.slice(
      selectionRange.start,
      selectionRange.end
    );

    const newComment = await storageAdapter.createComment({
      resourceId,
      commentType: 'selected-text',
      startOffset: selectionRange.start,
      endOffset: selectionRange.end,
      quotedText,
      initialReplyText: text,
    });

    // Add to local state
    setComments((prev) => [...prev, newComment]);

    // Notify parent of count change
    if (onCommentCountChange) {
      onCommentCountChange(comments.length + 1);
    }

    // Clear creation state
    setIsCreatingComment(false);
    setSelectionRange(null);

    // Activate new comment
    setActiveCommentId(newComment.id);
  } catch (error) {
    console.error('[NotesEditorDialog] Error creating comment:', error);
    // Keep creation UI open for retry
    throw error;
  }
};

/**
 * Handle canceling comment creation
 */
const handleCreateCommentCancel = () => {
  setIsCreatingComment(false);
  setSelectionRange(null);
};

/**
 * Handle adding reply to existing comment
 */
const handleAddReply = async (commentId: string, text: string) => {
  try {
    const newReply = await storageAdapter.addReply(commentId, text);

    // Update local state
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, replies: [...comment.replies, newReply] }
          : comment
      )
    );
  } catch (error) {
    console.error('[NotesEditorDialog] Error adding reply:', error);
    throw error;
  }
};

/**
 * Handle resolving comment
 */
const handleResolveComment = async (commentId: string) => {
  try {
    await storageAdapter.resolveComment(commentId);

    // Remove from local state (moved to resolved)
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    // Notify parent of count change
    if (onCommentCountChange) {
      onCommentCountChange(comments.length - 1);
    }

    // Clear active state if this was active
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
  } catch (error) {
    console.error('[NotesEditorDialog] Error resolving comment:', error);
    // Show error to user (optional: toast notification)
  }
};

/**
 * Handle deleting reply
 */
const handleDeleteReply = async (replyId: string) => {
  // Note: Only allowed if comment has >1 reply (don't orphan comment)
  try {
    await storageAdapter.deleteReply(replyId);

    // Update local state
    setComments((prev) =>
      prev.map((comment) => ({
        ...comment,
        replies: comment.replies.filter((r) => r.id !== replyId),
      }))
    );
  } catch (error) {
    console.error('[NotesEditorDialog] Error deleting reply:', error);
  }
};

/**
 * Handle clicking comment in sidebar (activate it)
 */
const handleCommentClick = (commentId: string) => {
  setActiveCommentId(commentId);
};
```

**Success check**: All handlers compile without errors.

### Step 4.5 – Integrate Text Tracking Hook (20 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After state declarations

**Add hook**:
```typescript
// Text tracking for comment offsets
const { handleTextChange } = useCommentTextTracking({
  resourceId,
  enabled: true,
  debounceMs: 2000, // Update DB every 2 seconds
});
```

**Wrap text change handler**:
```typescript
// Existing setCurrentValue calls need to trigger text tracking
const handleValueChange = (newValue: string) => {
  const oldValue = currentValue;

  // Update local state
  setCurrentValue(newValue);

  // Update comment offsets and stale status
  handleTextChange(oldValue, newValue, comments, setComments);
};
```

**Update MarkdownField onChange**:
```typescript
<MarkdownField
  value={currentValue}
  onChange={handleValueChange} // Changed from setCurrentValue
  // ... other props
/>
```

**Success check**: Text changes trigger offset recalculation.

### Step 4.6 – Update Dialog Layout for Sidebar (45 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: Lines 113-125 (DialogContent)

**Replace layout**:
```typescript
<DialogContent className="max-w-[1800px] max-h-[90vh] flex flex-col">
  <DialogHeader>
    <DialogTitle>Edit Notes</DialogTitle>
    <DialogDescription>
      Write your notes with markdown formatting. Raw text shows while editing,
      formatted output appears when you click outside the textbox.
    </DialogDescription>
  </DialogHeader>

  {/* NEW: Toolbar */}
  <CommentToolbar
    hasSelection={selectionRange !== null}
    onCreateComment={handleStartCommentCreation}
    onViewResolved={() => setShowResolvedComments(true)}
    unresolvedCount={comments.filter((c) => c.status === 'active').length}
  />

  {/* Main content area with sidebar */}
  <div className="flex-1 min-h-0 flex gap-4">
    {/* Editor area */}
    <div
      className={cn(
        'flex-1 min-h-0 max-h-[600px] overflow-y-auto px-1 transition-all',
        comments.length > 0 && 'pr-2'
      )}
    >
      <MarkdownField
        value={currentValue}
        onChange={handleValueChange}
        placeholder="Start writing your notes... Use markdown formatting."
        minHeight={400}
        className="font-reading text-base leading-relaxed"
        isEditing={true}
        readOnly={true}
        // TODO Phase 5: Add highlight rendering
      />
    </div>

    {/* Comment sidebar (appears when comments exist) */}
    {(comments.length > 0 || isCreatingComment) && (
      <CommentSidebar
        comments={comments}
        activeCommentId={activeCommentId}
        onCommentClick={handleCommentClick}
        onResolve={handleResolveComment}
        onAddReply={handleAddReply}
        onDeleteReply={handleDeleteReply}
        isCreatingComment={isCreatingComment}
        onCreateCommentSubmit={handleCreateCommentSubmit}
        onCreateCommentCancel={handleCreateCommentCancel}
      />
    )}
  </div>

  <DialogFooter className="border-t pt-4 mt-4">
    <Button onClick={handleSave} disabled={isLoading} className="ml-auto">
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="w-4 h-4 mr-2" />
          Save
        </>
      )}
    </Button>
  </DialogFooter>
</DialogContent>
```

**Success checks**:
- [ ] Toolbar renders above editor
- [ ] Sidebar appears when comments exist
- [ ] Layout transitions smoothly when sidebar shows/hides
- [ ] Dialog width expanded to 1800px to accommodate sidebar

### Rollback Strategy for Phase 4

**If integration breaks dialog**:

1. **Remove comment features from render**:
```typescript
// Comment out toolbar and sidebar in JSX
{/* <CommentToolbar ... /> */}
{/* <CommentSidebar ... /> */}
```

2. **Dialog still works** for editing notes.

3. **Revert file if needed**:
```bash
git checkout HEAD -- src/components/NotesEditorDialog.tsx
```

---

## Phase 5 – Highlight Rendering & Interaction (3-4 hours) ✅ HIGH

Status: ◐ PARTIAL

Implemented:
- `src/components/comments/TextHighlight.tsx` exists to render anchored highlight segments and manage active/hover states.

Remaining:
- Ensure click on highlight activates the corresponding comment and scrolls it into view reliably across large documents.
- Overlap rendering polish and accessibility labels.

---

## Testing Checklist (Phase 8)

### Database Testing
```sql
-- Verify comment creation
SELECT * FROM comments WHERE resource_id = '<test-resource-id>' ORDER BY created_at DESC LIMIT 5;

-- Verify threaded replies (replies are comments with thread_root_id)
SELECT id, thread_root_id, thread_prev_comment_id, body
FROM comments
WHERE resource_id = '<test-resource-id>' AND thread_root_id IS NOT NULL
ORDER BY created_at;

-- Verify RLS policies
SET ROLE authenticated;
SET request.jwt.claims.sub = '<user-id>';
SELECT COUNT(*) FROM comments; -- Should only see own comments
RESET ROLE;

-- Verify resolution
SELECT id, status, resolved_at FROM comments WHERE status = 'resolved';
```

### Manual QA Checklist
- [ ] Create selected-text comment by highlighting text
- [ ] Create general comment (future feature)
- [ ] Add reply to existing comment
- [ ] Resolve comment (disappears from sidebar)
- [ ] View resolved comments in modal
- [ ] Permanently delete resolved comment
- [ ] Click highlight → activates comment
- [ ] Click comment card → highlights text (darker yellow)
- [ ] Edit text inside highlighted range → offset extends
- [ ] Edit text before highlighted range → offsets shift
- [ ] Delete >50% of highlighted text → comment marked stale
- [ ] Undo edit → comment recovers from stale
- [ ] Open/close dialog → comments persist
- [ ] Save notes → comments unchanged
- [ ] Multiple overlapping highlights → all clickable

### Performance Testing
- [ ] 50+ comments → sidebar scrolls smoothly
- [ ] 10,000+ character notes → text tracking no lag
- [ ] Comment creation → saves in <500ms
- [ ] Dialog open → loads comments in <200ms

---

## Rollback Strategy (Overall)

### Emergency Rollback (All Phases)

**Option 1 – Feature Flag Disable** (Fastest):
```typescript
// In NotesEditorDialog.tsx
const ENABLE_COMMENTS = false; // Feature flag

if (!ENABLE_COMMENTS) {
  // Skip comment loading and rendering
  return <MarkdownField .../> // Original editor
}
```

**Option 2 – Git Revert** (Clean):
```bash
# Revert all commits related to commenting
git log --oneline --grep="comment" # Find commit hashes
git revert <commit-hash> # Revert each commit

# Or revert to last known good commit
git reset --hard <commit-before-comments>
git push origin main --force # DANGER: Only if necessary
```

**Option 3 – Database Rollback** (Preserve user data):
```sql
-- Drop threaded metadata (if needed) or entire comments table (preserves resources)
DROP TABLE IF EXISTS comments CASCADE;

-- Frontend will gracefully handle missing tables (try/catch in storage adapter)
```

**Impact**: Notes editing continues to work, comments feature removed.

---

## Summary

**Current Status**: Phases 0–4 complete; 5–6 partially complete (highlights, resolved modal exist). Remaining: integration polish, resource badges, full QA.

**Next Steps**:
1. Finish Phase 5 interactions and accessibility
2. Complete Phase 6 resolution workflows end-to-end
3. Implement Phase 7 badge integration
4. Execute Phase 8 testing & fix issues
5. Phase 9 polish & edge cases

**Risk Level**: Medium
- Text tracking correctness under rapid edits
- Highlight overlap and performance in large documents

**Dependencies**: None blocking; Supabase and UI libraries in place

**User Value**: Very High (enables inline discussion and review on notes)

---

*Document Version: 1.1*
*Updated: 2025-10-15*
*Status: Phases 0–4 complete; 5–6 partial*
*Estimated Completion: 2025-10-17*
