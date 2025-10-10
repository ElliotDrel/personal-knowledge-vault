# Notes Commenting System – Features & Functions Specification

## Vision
- Transform the notes editing experience into a collaborative-ready environment inspired by Google Docs, enabling users to annotate, discuss, and track thoughts within their notes through an intuitive commenting system.
- Provide a foundation for future AI-assisted commenting, collaborative editing, and advanced annotation features.
- Deliver a seamless commenting experience that works in both raw markdown and formatted preview modes without interrupting the writing flow.

## Scope

### In Scope
- Supabase schema additions for `comments` and `comment_replies` tables with full RLS policies.
- Two comment types: Selected-Text Comments (anchored to highlighted text) and General Comments (standalone annotations).
- Google Docs-style UI with floating toolbar, dynamic sidebar, and interactive highlights.
- Real-time text tracking with stale comment detection when underlying text changes significantly.
- Comment resolution system with dedicated resolved comments modal.
- Unresolved comment count indicator on ResourceDetail page header.
- Reply threading within comments for future collaboration readiness.
- Frontend storage adapter integration for comment CRUD operations.
- Character offset-based text position tracking with similarity detection.

### Out of Scope
- Multi-user collaboration (future phase, but schema is prepared).
- AI-generated comment suggestions (future phase, but data structure supports it).
- Comment notifications or activity feeds.
- Full-text search across comments (future enhancement).
- Comment export functionality.
- Nested reply threading (flat replies only in this phase).
- Comment editing history tracking.
- @mentions or user tagging.

## Primary Objectives

1. **Intuitive Comment Creation** – Users can highlight any text in notes and create comments via toolbar button with immediate visual feedback.
2. **Google Docs Parity** – Sidebar layout, highlight behavior, and interaction patterns match familiar Google Docs experience.
3. **Robust Text Tracking** – Comments track their underlying text through edits, with graceful degradation to general comments when text changes drastically.
4. **Resolution Workflow** – Users can mark comments as resolved, view resolved history, and permanently delete old comments.
5. **Future-Ready Architecture** – Database schema and component structure support multi-user collaboration and AI integration without refactoring.

## System Goals

- **Consistency** – Comment data structure identical across Supabase, TypeScript types, and UI rendering.
- **Non-Blocking** – Comment operations never prevent note saving or editing.
- **Performance** – Text tracking recalculates offsets on keystroke without UI lag (debounced database updates).
- **Extensibility** – New comment types (e.g., AI-generated insights) can be added with minimal code changes.
- **Collaboration-Ready** – Separate replies table and user_id tracking enable future multi-user features.

## Target Data Model

### TypeScript Interfaces

```typescript
export type CommentType = 'selected-text' | 'general';
export type CommentStatus = 'active' | 'resolved';

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
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;

  // Relations (loaded separately)
  replies?: CommentReply[];
}

export interface CommentReply {
  id: string;
  commentId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentInput {
  resourceId: string;
  commentType: CommentType;
  startOffset?: number;
  endOffset?: number;
  quotedText?: string;
  initialReplyText: string; // First reply is the comment content itself
}
```

### Database Schema

**`comments` table**:
- Primary key: `id` (UUID)
- Foreign keys: `resource_id` (CASCADE delete), `user_id` (CASCADE delete)
- Discriminator: `comment_type` ('selected-text' | 'general')
- Status tracking: `status` ('active' | 'resolved'), `resolved_at` (TIMESTAMPTZ)
- Text anchoring: `start_offset`, `end_offset`, `quoted_text` (nullable, required for selected-text)
- Stale detection: `is_stale`, `original_quoted_text`
- Constraint: Selected-text comments must have offsets and quoted text

**`comment_replies` table**:
- Primary key: `id` (UUID)
- Foreign keys: `comment_id` (CASCADE delete), `user_id` (CASCADE delete)
- Content: `text` (TEXT, NOT NULL, length check)
- Timestamps: `created_at`, `updated_at`

**RLS Policies**: Users can only access their own comments and replies (prepared for future shared resource policies).

### Comment Type Taxonomy

**Selected-Text Comments**:
- Anchored to specific character ranges in notes markdown
- Display highlight in text editor (light yellow, darker when active)
- Show quoted text in comment card
- Can become "stale" if underlying text changes >50%
- Example use: "This conclusion needs citation" on paragraph text

**General Comments**:
- Not anchored to specific text
- Display in sidebar without text highlight
- Used for overall observations or when text tracking becomes unreliable
- Example use: "Remember to add examples section" as standalone note
- Also used as fallback when selected-text comment becomes too stale

## UX Requirements

### Toolbar Integration

**Location**: Fixed toolbar bar positioned directly above the markdown editing area within NotesEditorDialog.

**Visual Design**:
- Single row with left-aligned tools and right-aligned utility buttons
- "Add Comment" button with icon (MessageSquarePlus) + text label
- "View Resolved" button showing unresolved count badge (e.g., "View Resolved (3)")
- Future-ready spacing for additional tools (formatting, AI features)

**Behavior**:
- "Add Comment" button disabled (greyed) when no text selected
- Button becomes active when user selects text in editor
- Click triggers comment creation flow (new comment card appears in sidebar)
- Selection range preserved when comment creation initiated

### Comment Sidebar

**Layout**: Fixed 320px width panel on right side of editing area, separated by border.

**Appearance States**:
- **No comments**: Sidebar hidden, editor full width
- **Active comments exist**: Editor shifts left, sidebar slides in with transition
- **Creating new comment**: New comment card appears at top of sidebar with input focused

**Comment Cards**:
- Rounded corners with subtle shadow
- Selected-text comments show quoted text preview at top (truncated if long)
- Reply threads displayed chronologically with timestamps (e.g., "5 minutes ago")
- Active comment has blue ring border and larger shadow (pops forward)
- Stale comments show orange warning badge + original text reference
- Hover effects on cards indicate clickability

**Interaction**:
- Click comment card → activates it (ring border, darker highlight in editor)
- Click "Resolve" button → comment moves to resolved list
- Click "Reply" button → inline reply input appears
- Scrolling active comment into view automatically when clicked from editor

### Text Highlighting

**Visual States**:
- **Inactive highlight**: Light yellow background (`bg-yellow-100`)
- **Active highlight**: Darker yellow background (`bg-yellow-300`) when comment selected
- **Stale highlight**: Orange background (`bg-orange-100`) indicating text mismatch
- **Overlapping highlights**: Multiple layers rendered independently (z-index stacking)

**Interaction**:
- Click highlighted text → activates corresponding comment (sidebar scrolls, highlight darkens)
- Cursor changes to pointer on hover over highlights
- Highlights update position in real-time as user types
- Multiple overlapping highlights on same text supported (all clickable)

### Comment Creation Flow

**Step 1 - Selection**:
1. User highlights text in markdown editor (drag to select)
2. Toolbar "Add Comment" button enables (color change, no longer greyed)

**Step 2 - Initiation**:
1. User clicks "Add Comment" button
2. New comment card appears at top of sidebar
3. Text input within card auto-focused
4. Highlighted text remains selected (visual feedback)

**Step 3 - Composition**:
1. User types comment text into input field
2. "Comment" button disabled until text entered (prevents empty comments)
3. "Cancel" button available to abort

**Step 4 - Submission**:
1. User clicks "Comment" button (or presses Ctrl+Enter)
2. Comment saved to database (with reply as first message)
3. Comment card moves from "new" position to chronological order
4. Highlight appears in editor text
5. Input cleared, sidebar remains open

**Step 5 - Cancellation Handling**:
- **If user clicks outside before typing**: Comment creation cancelled silently, no database entry
- **If user types then clicks outside**: Confirmation dialog ("Save comment?" / "Discard changes")
- **If user clicks Cancel button**: Same as clicking outside before typing

### Comment Resolution System

**Marking Resolved**:
- "Resolve" button (checkmark icon) in top-right of each comment card
- Click triggers status update (`status: 'resolved'`, `resolved_at: NOW()`)
- Comment immediately disappears from active sidebar
- Unresolved count decrements in toolbar and ResourceDetail badge

**Viewing Resolved Comments**:
- "View Resolved" button in toolbar opens modal dialog
- Modal displays all resolved comments with resolution timestamps
- Read-only display (no replies can be added)
- "Delete Permanently" button (trash icon) on each resolved comment
- Confirmation dialog before permanent deletion

**Permanent Deletion**:
- User clicks trash icon on resolved comment
- Alert dialog: "This will permanently delete the comment and all replies."
- Confirm → Database row deleted (CASCADE removes all replies)
- Modal list updates to remove deleted comment

### ResourceDetail Page Integration

**Unresolved Comment Indicator**:
- Badge appears next to "Your Notes" heading when unresolved comments exist
- Shows count: "3 unresolved" (grey badge, subtle)
- Icon indicator on "Edit" button (MessageCircle icon, orange color) when count > 0
- Clicking "Edit" button opens NotesEditorDialog (standard behavior, comments accessible inside)

**Visual Treatment**:
- Non-intrusive (doesn't block notes preview)
- Clear call-to-action (user knows comments need attention)
- Count updates reactively when comments resolved/added

### Text Tracking Behavior

**Real-Time Offset Updates**:
- User types **before** highlighted text → offsets shift right by inserted character count
- User types **after** highlighted text → no offset change (comment unaffected)
- User types **inside** highlighted text → end offset extends to include new characters
- User deletes **inside** highlighted text → end offset contracts

**Stale Detection**:
- System compares current text at `[startOffset:endOffset]` with stored `quotedText`
- Character similarity calculated (matching chars / total chars)
- If similarity < 50% → mark comment as stale (`is_stale: true`)
- Stale comment displays warning badge: "Stale - text changed"
- Original quoted text preserved in `originalQuotedText` field for reference

**Conversion to General Comment** (Future Enhancement):
- When comment becomes stale, option to convert to general comment
- Creates new general comment with message: "Original text: '[original]' - This comment became stale."
- Removes text anchoring, keeps comment accessible

**Edge Cases Handled**:
- Undo/Redo operations → offsets recalculate based on final text state
- Cut/Paste → offsets update, similarity check triggers
- Select-All + Delete → all comments marked stale or converted to general

## Backend & Integration Requirements

### Supabase Database

**Migration 1 – Create `comments` Table**:
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  comment_type TEXT NOT NULL CHECK (comment_type IN ('selected-text', 'general')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),

  start_offset INTEGER,
  end_offset INTEGER,
  quoted_text TEXT,
  is_stale BOOLEAN DEFAULT false,
  original_quoted_text TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  CONSTRAINT selected_text_requires_offsets CHECK (
    (comment_type = 'general') OR
    (comment_type = 'selected-text' AND start_offset IS NOT NULL AND end_offset IS NOT NULL AND quoted_text IS NOT NULL)
  )
);

CREATE INDEX idx_comments_resource_user ON comments(resource_id, user_id);
CREATE INDEX idx_comments_status ON comments(resource_id, status);
CREATE INDEX idx_comments_type ON comments(resource_id, comment_type);
```

**Migration 2 – Create `comment_replies` Table**:
```sql
CREATE TABLE comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT text_not_empty CHECK (LENGTH(TRIM(text)) > 0)
);

CREATE INDEX idx_comment_replies_comment ON comment_replies(comment_id, created_at);
```

**Migration 3 – Row Level Security**:
```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can view their own comments"
  ON comments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

-- Comment replies policies (same pattern)
CREATE POLICY "Users can view replies to their comments"
  ON comment_replies FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM comments WHERE id = comment_id
  ));

CREATE POLICY "Users can create replies to their comments"
  ON comment_replies FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM comments WHERE id = comment_id
  ));

CREATE POLICY "Users can update their own replies"
  ON comment_replies FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON comment_replies FOR DELETE USING (auth.uid() = user_id);
```

### Storage Adapter Extension

**New Interface**: `CommentAdapter` added to storage layer

**Core Methods**:
- `getComments(resourceId, status?)` → Fetch comments with replies joined
- `getUnresolvedCount(resourceId)` → Count for badge display
- `createComment(input)` → Create comment + first reply atomically
- `addReply(commentId, text)` → Add reply to existing comment
- `updateComment(commentId, updates)` → Update quoted text, stale status, etc.
- `resolveComment(commentId)` → Mark resolved with timestamp
- `markAsStale(commentId, newQuotedText)` → Set stale flag + preserve original
- `deleteComment(commentId)` → Permanent deletion (resolved comments only)

**Why This Approach**:
- Consistent with existing `resourceAdapter` pattern in codebase
- Single source of truth for comment operations
- Easy to swap storage backends (Supabase → localStorage) in future
- Type-safe contracts prevent runtime errors

### TypeScript Type Generation

**Command**: `npx supabase gen types typescript --linked > src/types/supabase-generated.ts`

**Updates**:
- `Database['public']['Tables']['comments']` type generated
- `Database['public']['Tables']['comment_replies']` type generated
- Enums for `CommentType` and `CommentStatus` automatically included

**Integration**: Storage adapter uses generated types for database operations, ensuring compile-time safety.

## Styling Guidelines

### Color System

**Comment Highlights**:
- `bg-yellow-100` – Inactive selected-text highlight (light yellow, subtle)
- `bg-yellow-300` – Active selected-text highlight (darker yellow, prominent)
- `bg-orange-100` – Stale selected-text highlight (orange warning tone)

**Comment Cards**:
- `border-border` – Default card border (theme-aware)
- `ring-2 ring-primary` – Active card border (blue, prominent)
- `border-orange-400` – Stale comment card border (warning indicator)
- `bg-card` – Card background (theme-aware light/dark)

**Badges**:
- `Badge variant="secondary"` – Platform/status badges (grey tone)
- `Badge variant="warning"` – Stale warning badges (orange/yellow)

### Layout Classes

**Sidebar**:
- `w-[320px]` – Fixed sidebar width (matches Google Docs feel)
- `border-l` – Left border separator
- `overflow-y-auto` – Scrollable comment list
- `space-y-4` – Consistent vertical spacing between cards

**Toolbar**:
- `border-b pb-2 mb-2` – Bottom border with padding
- `flex items-center justify-between` – Tool alignment
- `gap-2` – Spacing between toolbar buttons

**Highlights**:
- `transition-all` – Smooth color transitions on activate/deactivate
- `rounded-sm` – Subtle rounding on highlight edges
- `cursor-pointer` – Indicate clickability

### Responsive Behavior

- Sidebar remains 320px on desktop (1024px+ viewport)
- Tablet (768px-1023px): Sidebar overlays editor (modal-like)
- Mobile (<768px): Sidebar fullscreen when comments open (dismissible)

### Accessibility

- `aria-label` on toolbar buttons (e.g., "Add comment to selected text")
- `role="button"` on clickable highlights
- Focus indicators on comment cards (keyboard navigation support)
- Screen reader announcements: "Comment created", "Comment resolved"
- Contrast ratios meet WCAG AA on all highlight colors

## Testing & Validation Targets

### Functional Requirements
- [ ] User can create selected-text comment by highlighting and clicking toolbar button
- [ ] User can create general comment (future: via dedicated button)
- [ ] Comments display in sidebar with correct quoted text
- [ ] Clicking highlight activates comment and scrolls sidebar
- [ ] Clicking comment card highlights corresponding text
- [ ] User can add replies to existing comments
- [ ] User can resolve comments (status updates to 'resolved')
- [ ] Resolved comments accessible via "View Resolved" modal
- [ ] User can permanently delete resolved comments
- [ ] Unresolved count displays correctly on ResourceDetail page
- [ ] Text tracking updates offsets when user edits notes
- [ ] Stale detection triggers at <50% similarity threshold
- [ ] Overlapping highlights all clickable and functional

### Database Validation
```sql
-- After creating comment, verify structure
SELECT
  id,
  comment_type,
  status,
  start_offset,
  end_offset,
  LENGTH(quoted_text) as quoted_text_length,
  is_stale,
  (SELECT COUNT(*) FROM comment_replies WHERE comment_id = comments.id) as reply_count
FROM comments
WHERE resource_id = '<test-resource-id>'
ORDER BY created_at DESC;

-- Verify RLS policies working
SET ROLE authenticated;
SET request.jwt.claims.sub = '<user-id>';
SELECT * FROM comments; -- Should only see own comments
```

### Performance Requirements
- [ ] Comment sidebar renders in <100ms
- [ ] Text tracking offset recalculation completes in <16ms (60fps)
- [ ] Comment creation saves to database in <500ms
- [ ] Loading comments for resource takes <200ms
- [ ] Scrolling sidebar with 50+ comments remains smooth

### UI/UX Requirements
- [ ] Highlight colors clearly distinguish active vs inactive
- [ ] Comment cards visually group with proper spacing
- [ ] Toolbar button disabled state obvious (grey, no hover effect)
- [ ] Confirmation dialogs prevent accidental data loss
- [ ] Mobile layout usable (sidebar doesn't break on small screens)
- [ ] Dark mode support (all colors theme-aware)

## Accessibility & Performance

### Keyboard Navigation
- Tab through toolbar buttons
- Enter/Space to activate "Add Comment"
- Arrow keys to navigate comment list in sidebar
- Escape to close resolved comments modal
- Ctrl+Enter to submit comment/reply quickly

### Screen Reader Support
- Announce comment count changes ("3 unresolved comments")
- Describe active comment when clicked ("Comment on 'productivity tips' text")
- Read quoted text when focusing comment card
- Announce resolution actions ("Comment resolved")

### Performance Optimizations
- Debounce text tracking database updates (every 2 seconds instead of every keystroke)
- Virtualize sidebar if >100 comments (react-window)
- Memoize comment sorting and filtering
- Lazy load resolved comments (only fetch when modal opened)

## Monitoring & Telemetry

### Metrics to Track (Future)
- Average comments per resource
- Comment resolution rate (resolved / total created)
- Stale comment frequency (trigger rate)
- Time from creation to resolution
- Reply thread depth (average replies per comment)

### Error Monitoring
- Comment creation failures (database errors)
- Text tracking anomalies (unexpected offset shifts)
- RLS policy violations (access denied errors)
- Sidebar render errors (component crashes)

## Future Enhancements

### Priority 1: AI-Generated Comments
- AI suggests comments during note editing (e.g., "Add citation here")
- Comments created with `commentType: 'ai-suggestion'`
- Users can accept/reject AI suggestions
- Separate styling (blue highlight instead of yellow)

### Priority 2: Multi-User Collaboration
- Comments visible to all users with resource access
- User avatars on comment cards
- Real-time updates (Supabase Realtime channels)
- @mentions to notify specific users

### Priority 3: Comment Search
- Full-text search across comment text and quoted text
- Filter resources by "has comments"
- Search results highlight matching comments

### Priority 4: Rich Text in Comments
- Markdown formatting in comment text
- Code blocks, links, bold/italic
- Preview mode for formatted comments

### Priority 5: Comment Export
- Include comments in resource export (PDF, Markdown)
- Comments appear as footnotes or annotations
- Export resolved comments separately

### Priority 6: Comment Analytics
- Dashboard showing comment activity over time
- Most commented resources
- Resolution time trends

## Deliverables Checklist

### Database
- [ ] `comments` table migration created and applied
- [ ] `comment_replies` table migration created and applied
- [ ] RLS policies migration created and applied
- [ ] Indexes created for performance
- [ ] Database validation queries executed successfully

### Types & Storage
- [ ] TypeScript interfaces defined (`src/types/comments.ts`)
- [ ] Storage adapter methods implemented
- [ ] Supabase-generated types regenerated
- [ ] Type safety verified (no `any` types)

### Components
- [ ] `CommentToolbar` component created
- [ ] `CommentSidebar` component created
- [ ] `CommentCard` component created
- [ ] `MarkdownFieldWithHighlights` component created
- [ ] `ResolvedCommentsModal` component created
- [ ] `NotesEditorDialog` enhanced with commenting
- [ ] `ResourceDetail` updated with comment count badge

### Utilities
- [ ] Text tracking logic implemented (`src/utils/commentTextTracking.ts`)
- [ ] Similarity calculation function tested
- [ ] Offset update function tested
- [ ] Stale detection function tested

### Testing
- [ ] Unit tests for text tracking utilities
- [ ] Integration tests for comment creation flow
- [ ] Manual QA checklist completed
- [ ] Edge case testing (overlaps, stale, deletion)

### Deployment
- [ ] Database migrations applied to production
- [ ] Frontend deployed with comment features
- [ ] No errors in Supabase logs
- [ ] No errors in browser console
- [ ] Smoke test passed (create, resolve, delete comment)

### Documentation
- [ ] Feature specification document (this file)
- [ ] Implementation plan completed
- [ ] CLAUDE.md updated with commenting patterns
- [ ] Code comments added for complex logic

---

## Summary

**Feature**: Google Docs-style commenting system for notes with selected-text and general comment types, resolution workflow, and real-time text tracking.

**Purpose**: Enable users to annotate, discuss, and track thoughts within notes; prepare foundation for AI-assisted commenting and future collaboration.

**Approach**: Leverage Supabase for comment storage with RLS, implement character offset-based text tracking with stale detection, and deliver Google Docs-inspired UI with sidebar, highlights, and resolution modal.

**Impact**:
- **User Experience**: Transforms notes from static text to annotated, discussion-ready documents
- **Technical Debt**: Zero (new feature, clean schema, follows existing patterns)
- **Performance**: Minimal (debounced updates, indexed queries, virtualized sidebar)
- **Reliability**: High (graceful degradation, non-blocking, clear error states)

**Estimated Effort**: 5-7 days for full implementation, testing, and deployment

**Risk Level**: Medium (text tracking complexity, new UI patterns, database schema additions)

**Dependencies**: Supabase RLS, React hooks, TypeScript type safety, existing NotesEditorDialog

**User Value**: Very High (enables new workflows, future-proofs for collaboration, unlocks AI commenting potential)

---

*Document Version: 1.0*
*Created: 2025-10-10*
*Status: Ready for Implementation*
