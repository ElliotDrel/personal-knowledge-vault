# WYSIWYG Editor Standardization – Implementation Plan

## Overview & Strategy

- **Goal**: Replace current markdown rendering with TipTap WYSIWYG editor for notes and transcripts, creating standardized text boxes with unified styling across notes, transcripts, and metadata fields.
- **Approach**: Backend-first TipTap integration with markdown storage preservation, followed by component architecture refactoring (base dialog → specialized variants), comment system migration to ProseMirror positions, and metadata styling standardization.
- **Guiding principles**: Markdown storage format for AI compatibility, ProseMirror automatic position tracking for comments, minimal code duplication through base components, graceful comment staleness detection, WYSIWYG editing with markdown shortcuts support.

## Current Status (2025-10-23)

**STATUS**: Ready for implementation. Library research complete (TipTap selected), architecture decisions finalized, migration strategy validated against existing comment system.

### Project Context
- **Base Feature**: NotesEditorDialog exists with markdown editing via react-markdown + remark-gfm
- **Comment System**: Fully operational with character offset-based positions (Phases 0-8 complete from 10-10)
- **UI Framework**: shadcn/ui components for dialogs, cards, buttons, textareas
- **State Management**: React hooks with React Query for data fetching
- **Current Limitations**: Notes, transcripts, and metadata have inconsistent UIs; markdown-only editing without WYSIWYG preview during editing

### Prerequisites Verified
- [x] NotesEditorDialog working with markdown editing
- [x] Comment system operational with text anchoring
- [x] Supabase authentication and RLS configured
- [x] Storage adapter pattern established
- [x] TypeScript strict mode enabled
- [x] shadcn/ui components installed
- [ ] TipTap dependencies installed (Phase 0)
- [ ] Comment migration strategy validated (Phase 3)

## Phases & Timeline

| Phase | Focus | Duration | Status | Priority |
|-------|-------|----------|--------|----------|
| 0 | Research & dependency setup | 2-3 hours | ❌ PENDING | CRITICAL |
| 1 | TipTap editor component | 4-5 hours | ❌ PENDING | CRITICAL |
| 2 | Base dialog architecture | 3-4 hours | ❌ PENDING | HIGH |
| 3 | Comment system migration | 5-6 hours | ❌ PENDING | CRITICAL |
| 4 | Notes & transcript dialogs | 4-5 hours | ❌ PENDING | HIGH |
| 5 | ResourceDetail integration | 3-4 hours | ❌ PENDING | HIGH |
| 6 | Metadata styling standardization | 2-3 hours | ❌ PENDING | MEDIUM |
| 7 | Testing & validation | 4-6 hours | ❌ PENDING | CRITICAL |
| 8 | Database migration & deployment | 2-3 hours | ❌ PENDING | HIGH |
| **TOTAL** | **Full implementation** | **~30-40 hours** | | **~5-7 days** |

---

## Phase 0 – Research & Dependency Setup (2-3 hours) ❌ CRITICAL

### Objective
Install TipTap dependencies, validate bundle size impact, create test environment for WYSIWYG functionality.

### Prerequisites
- [ ] Working tree clean (commit pending changes)
- [ ] Node modules up to date: `npm install`
- [ ] Current bundle size baseline recorded

### Step 0.1 – Record Current Bundle Size (15 minutes)

**Commands**:
```bash
# Build production bundle
npm run build

# Record baseline sizes
ls -lh dist/assets/*.js | grep -E "index.*js$"
```

**Success check**: Baseline bundle size documented for comparison.

### Step 0.2 – Install TipTap Dependencies (30 minutes)

**Commands**:
```bash
# Core TipTap packages
npm install @tiptap/react@^2.0.0 @tiptap/pm@^2.0.0 @tiptap/starter-kit@^2.0.0

# Markdown support
npm install @tiptap/extension-typography@^2.0.0

# Additional dependencies (if needed)
npm install marked@^14.0.0
```

**Expected packages**:
- `@tiptap/react`: React bindings for TipTap
- `@tiptap/pm`: ProseMirror dependencies (automatic position tracking)
- `@tiptap/starter-kit`: Pre-configured extensions (Bold, Italic, Headings, etc.)
- `@tiptap/extension-typography`: Smart typography transforms

**Validation**:
```bash
# Verify installations
npm list @tiptap/react @tiptap/pm @tiptap/starter-kit

# Check for peer dependency warnings
npm ls
```

**Success checks**:
- [ ] All packages installed without errors
- [ ] No peer dependency conflicts
- [ ] `package.json` and `package-lock.json` updated

### Step 0.3 – Verify Bundle Size Impact (20 minutes)

**Commands**:
```bash
# Rebuild with new dependencies
npm run build

# Compare new bundle sizes
ls -lh dist/assets/*.js | grep -E "index.*js$"
```

**Expected impact**:
- TipTap core: ~85 KB minified
- With ProseMirror: ~120 KB total
- Acceptable increase for WYSIWYG functionality

**Success check**: Bundle size increase documented and acceptable (<150 KB increase).

### Step 0.4 – Create Test Component (60 minutes)

**File**: `src/components/ui/__test__/TipTapTest.tsx` (NEW, temporary)

**Purpose**: Validate TipTap works in project environment before full integration.

**Implementation**:
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function TipTapTest() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Test **bold** and *italic*</p>',
  });

  return (
    <div className="border p-4 rounded">
      <EditorContent editor={editor} />
      <pre className="mt-4 text-xs">
        {JSON.stringify(editor?.getHTML(), null, 2)}
      </pre>
    </div>
  );
}
```

**Test manually**:
1. Import component in a test page
2. Verify editor renders
3. Test basic formatting (Bold, Italic, Headings)
4. Test keyboard shortcuts (Ctrl+B, Ctrl+I)
5. Verify HTML output in pre-formatted section

**Success checks**:
- [ ] Editor renders without errors
- [ ] Formatting buttons work
- [ ] Keyboard shortcuts work
- [ ] Output shows proper HTML

### Step 0.5 – Remove Test Component (10 minutes)

**After validation**:
```bash
# Remove test file
rm src/components/ui/__test__/TipTapTest.tsx

# Commit dependency additions
git add package.json package-lock.json
git commit -m "chore: add TipTap dependencies for WYSIWYG editor"
```

**Success check**: Test component removed, dependencies committed.

### Rollback Strategy for Phase 0

**If dependencies cause issues**:
```bash
# Uninstall TipTap packages
npm uninstall @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-typography marked

# Restore package.json
git checkout HEAD -- package.json package-lock.json

# Reinstall clean dependencies
npm install
```

**Impact**: No code changes yet, safe to revert.

---

## Phase 1 – TipTap Editor Component (4-5 hours) ❌ CRITICAL

### Objective
Build reusable `WYSIWYGEditor` component that replaces `MarkdownField` with TipTap, supporting markdown import/export, formatting toolbar, and keyboard shortcuts.

### Step 1.1 – Create Base WYSIWYGEditor Component (120 minutes)

**File**: `src/components/ui/wysiwyg-editor.tsx` (NEW)

**Create directory if needed**:
```bash
mkdir -p src/components/ui
```

**Interface definition**:
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';

interface WYSIWYGEditorProps {
  value: string; // Markdown string
  onChange?: (value: string) => void; // Returns markdown
  placeholder?: string;
  className?: string;
  minHeight?: number;
  readOnly?: boolean;
  showToolbar?: boolean; // Default: true
  autoFocus?: boolean;
}

export function WYSIWYGEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  className,
  minHeight = 300,
  readOnly = false,
  showToolbar = true,
  autoFocus = false,
}: WYSIWYGEditorProps) {
  // Editor instance with markdown support
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !readOnly,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      // Convert to markdown on change
      const html = editor.getHTML();
      // TODO: Implement HTML → Markdown conversion
      onChange?.(html);
    },
  });

  return (
    <div className={cn('border rounded-lg', className)}>
      {showToolbar && !readOnly && <EditorToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose max-w-none p-4"
        style={{ minHeight: `${minHeight}px` }}
      />
    </div>
  );
}
```

**Key features**:
- Markdown input/output (HTML intermediary)
- Read-only mode support
- Optional toolbar
- Configurable min height
- Auto-focus support

**Success checks**:
- [ ] Component compiles without errors
- [ ] Editor accepts markdown as input
- [ ] onChange callback fires on edits
- [ ] Read-only mode works

### Step 1.2 – Implement EditorToolbar Component (90 minutes)

**File**: Same file (`wysiwyg-editor.tsx`)

**Implementation**:
```typescript
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react';

interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor>;
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const toolbarButtons = [
    {
      icon: Bold,
      label: 'Bold',
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: 'Italic',
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    // Additional buttons...
  ];

  return (
    <div className="border-b p-2 flex gap-1">
      {toolbarButtons.map((btn) => (
        <Button
          key={btn.label}
          size="sm"
          variant={btn.isActive ? 'default' : 'ghost'}
          onClick={btn.onClick}
          aria-label={btn.label}
        >
          <btn.icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );
}
```

**Toolbar buttons to include**:
- Bold (Ctrl+B)
- Italic (Ctrl+I)
- Heading 1, 2, 3
- Bullet list
- Numbered list
- Blockquote
- Code block

**Success checks**:
- [ ] Toolbar renders above editor
- [ ] Buttons toggle formatting
- [ ] Active state shows correctly
- [ ] Keyboard shortcuts work (Ctrl+B, Ctrl+I)

### Step 1.3 – Add Markdown Import/Export (60 minutes)

**Install markdown conversion library**:
```bash
npm install turndown@^7.0.0
```

**Update component**:
```typescript
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// In onUpdate callback
onUpdate: ({ editor }) => {
  const html = editor.getHTML();
  const markdown = turndownService.turndown(html);
  onChange?.(markdown);
}
```

**Markdown → HTML (on load)**:
```typescript
import { marked } from 'marked';

const editor = useEditor({
  extensions: [StarterKit],
  content: marked(value), // Convert markdown to HTML
  // ...
});
```

**Success checks**:
- [ ] Markdown input renders correctly
- [ ] HTML converts back to markdown
- [ ] Markdown features preserved (headings, lists, bold, italic)

### Step 1.4 – Test WYSIWYGEditor Standalone (30 minutes)

**Create test page** (temporary):
```typescript
// In a test route
const [markdown, setMarkdown] = useState('# Hello\n\nThis is **bold** text.');

<WYSIWYGEditor
  value={markdown}
  onChange={setMarkdown}
  showToolbar={true}
  minHeight={400}
/>

<pre>{markdown}</pre>
```

**Test cases**:
1. Load with markdown → renders formatted
2. Edit text → onChange fires with markdown
3. Click Bold button → text becomes bold
4. Type `**bold**` → renders as bold (markdown shortcut)
5. Read-only mode → no editing allowed

**Success checks**:
- [ ] All test cases pass
- [ ] No console errors
- [ ] Performance acceptable (no lag)

### Rollback Strategy for Phase 1

**If editor component has issues**:
```bash
# Remove new component
rm src/components/ui/wysiwyg-editor.tsx

# Revert to markdown-field
git checkout HEAD -- src/components/ui/markdown-field.tsx
```

**Impact**: App still uses old markdown editor, no functionality lost.

---

## Phase 2 – Base Dialog Architecture (3-4 hours) ❌ HIGH

### Objective
Create reusable `TextEditorDialog` base component that both `NotesEditorDialog` and `TranscriptEditorDialog` will extend.

### Step 2.1 – Create Base TextEditorDialog Component (90 minutes)

**File**: `src/components/dialogs/TextEditorDialog.tsx` (NEW)

**Create directory**:
```bash
mkdir -p src/components/dialogs
```

**Interface definition**:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WYSIWYGEditor } from '@/components/ui/wysiwyg-editor';
import { Loader2, Save } from 'lucide-react';

interface TextEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  isLoading?: boolean;
  showToolbar?: boolean; // Default: true
  children?: React.ReactNode; // For additional toolbar items
}

export function TextEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  initialValue,
  onSave,
  isLoading = false,
  showToolbar = true,
  children,
}: TextEditorDialogProps) {
  const [currentValue, setCurrentValue] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentValue(initialValue);
      setIsDirty(false);
    }
  }, [open, initialValue]);

  const handleSave = async () => {
    await onSave(currentValue);
    setIsDirty(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Additional toolbar items slot */}
        {children}

        <div className="flex-1 min-h-0 overflow-y-auto">
          <WYSIWYGEditor
            value={currentValue}
            onChange={(val) => {
              setCurrentValue(val);
              setIsDirty(true);
            }}
            showToolbar={showToolbar}
            minHeight={400}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isLoading || !isDirty}>
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
    </Dialog>
  );
}
```

**Key features**:
- Reusable base for both notes and transcript
- Built-in save functionality
- Dirty state tracking
- Configurable toolbar visibility
- Children slot for additional toolbar items (e.g., comment tools)

**Success checks**:
- [ ] Component compiles without errors
- [ ] Dialog opens/closes correctly
- [ ] Save button disabled when not dirty
- [ ] Loading state shows correctly

### Step 2.2 – Test Base Dialog (30 minutes)

**Create temporary test**:
```typescript
const [open, setOpen] = useState(false);

<TextEditorDialog
  open={open}
  onOpenChange={setOpen}
  title="Test Editor"
  description="Testing base dialog"
  initialValue="# Test\n\nHello world"
  onSave={async (val) => {
    console.log('Saved:', val);
  }}
/>
```

**Test cases**:
1. Open dialog → editor shows
2. Edit text → dirty state updates
3. Save → callback fires with markdown
4. Close without saving → no changes saved
5. Reopen → reverts to initial value

**Success checks**:
- [ ] All test cases pass
- [ ] No console errors
- [ ] Smooth open/close animations

### Rollback Strategy for Phase 2

**If base dialog has issues**:
```bash
# Remove new component
rm src/components/dialogs/TextEditorDialog.tsx
rmdir src/components/dialogs # if empty
```

**Impact**: No existing functionality affected, can revert cleanly.

---

## Phase 3 – Comment System Migration (5-6 hours) ❌ CRITICAL

### Objective
Migrate character offset-based comment system to ProseMirror position tracking with simple staleness detection.

### Step 3.1 – Database Schema Updates (60 minutes)

**File**: `supabase/migrations/20251023000001_add_comment_staleness_fields.sql` (NEW)

**Migration content**:
```sql
-- Add staleness detection fields to comments table
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS original_text_snippet TEXT,
  ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT false;

-- Index for filtering stale comments
CREATE INDEX IF NOT EXISTS idx_comments_stale
  ON comments(resource_id, is_stale)
  WHERE comment_type = 'selected-text';

-- Comments for documentation
COMMENT ON COLUMN comments.original_text_snippet IS 'First 100 chars of original text for staleness detection';
COMMENT ON COLUMN comments.is_stale IS 'True if comment text has changed significantly or been deleted';
```

**Validation query**:
```sql
-- Verify columns added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comments'
  AND column_name IN ('original_text_snippet', 'is_stale')
ORDER BY ordinal_position;
```

**Expected result**: 2 new columns (original_text_snippet TEXT, is_stale BOOLEAN)

**Success check**: Migration applies without errors, columns visible in database.

### Step 3.2 – Update Comment Type Definitions (45 minutes)

**File**: `src/types/comments.ts`

**Location**: Add to existing `Comment` interface (around line 15)

**Changes**:
```typescript
export interface Comment {
  // ... existing fields

  // NEW: Staleness detection (for ProseMirror migration)
  originalTextSnippet?: string;  // First 100 chars for comparison
  isStale?: boolean;             // Orphaned or content drastically changed
}
```

**Update storage adapter types**:
```typescript
// In CreateCommentInput
export interface CreateCommentInput {
  // ... existing fields

  // NEW: Store snippet at creation
  originalTextSnippet?: string;
}
```

**Success check**: TypeScript compiles without errors, types updated.

### Step 3.3 – Implement Staleness Detection Utility (90 minutes)

**File**: `src/utils/commentStalenessDetection.ts` (NEW)

**Implementation**:
```typescript
import type { Comment } from '@/types/comments';

/**
 * Simple similarity check between two strings
 * Returns percentage (0-100) of matching characters
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  return (matches / longer.length) * 100;
}

/**
 * Check if comment should be marked stale
 *
 * Triggers staleness when:
 * 1. Text at offset range is completely deleted (empty)
 * 2. Text similarity < 30% (complete content change)
 */
export function checkCommentStaleness(
  fullText: string,
  comment: Comment
): { isStale: boolean; reason?: string } {
  // General comments can't be stale
  if (comment.commentType !== 'selected-text') {
    return { isStale: false };
  }

  const { startOffset, endOffset, originalTextSnippet } = comment;

  if (startOffset === undefined || endOffset === undefined || !originalTextSnippet) {
    return { isStale: false };
  }

  // Extract current text at position
  const currentText = fullText.slice(startOffset, endOffset);

  // Case 1: Text deleted (orphaned comment)
  if (!currentText || currentText.trim().length === 0) {
    return { isStale: true, reason: 'Text deleted' };
  }

  // Case 2: Complete content mismatch
  const similarity = calculateSimilarity(originalTextSnippet, currentText);
  if (similarity < 30) {
    return { isStale: true, reason: 'Content changed significantly' };
  }

  return { isStale: false };
}

/**
 * Update comment with staleness status
 */
export function updateCommentStaleness(
  comment: Comment,
  fullText: string
): Comment {
  const { isStale, reason } = checkCommentStaleness(fullText, comment);

  if (isStale && !comment.isStale) {
    console.log(`[Staleness] Comment ${comment.id} marked stale: ${reason}`);
    return { ...comment, isStale: true };
  }

  if (!isStale && comment.isStale) {
    console.log(`[Staleness] Comment ${comment.id} recovered from stale`);
    return { ...comment, isStale: false };
  }

  return comment;
}
```

**Success checks**:
- [ ] Utility compiles without errors
- [ ] Similarity calculation returns 0-100
- [ ] Orphan detection works (empty text)
- [ ] Content mismatch detection works (<30% similarity)

### Step 3.4 – Integrate with Storage Adapter (45 minutes)

**File**: `src/data/supabaseStorage.ts`

**Location**: Update `createComment` method (around line 686)

**Changes**:
```typescript
async createComment(input: CreateCommentInput): Promise<CommentWithReplies> {
  const user = await this.getCurrentUser();

  // NEW: Extract text snippet for staleness detection
  let originalTextSnippet: string | undefined;
  if (input.commentType === 'selected-text' && input.quotedText) {
    originalTextSnippet = input.quotedText.slice(0, 100); // First 100 chars
  }

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
      original_text_snippet: originalTextSnippet, // NEW
      is_stale: false, // NEW: Start as fresh
      // ... other fields
    })
    .select()
    .single();

  // ... rest of method
}
```

**Success check**: Comments created with originalTextSnippet populated.

### Step 3.5 – Add Staleness Check to NotesEditorDialog (60 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: Add effect to check staleness on text changes

**Implementation**:
```typescript
import { updateCommentStaleness } from '@/utils/commentStalenessDetection';
import { useDebouncedCallback } from 'use-debounce';

// Add state
const [lastCheckedText, setLastCheckedText] = useState(initialValue);

// Debounced staleness check (runs 2 seconds after user stops typing)
const checkStaleness = useDebouncedCallback(
  async (newText: string) => {
    const updatedComments = comments.map(comment =>
      updateCommentStaleness(comment, newText)
    );

    // Update local state
    setComments(updatedComments);

    // Persist stale flags to database (only changed ones)
    const staleChanged = updatedComments.filter((c, i) =>
      c.isStale !== comments[i].isStale
    );

    for (const comment of staleChanged) {
      await storageAdapter.updateComment(comment.id, {
        isStale: comment.isStale,
      });
    }

    setLastCheckedText(newText);
  },
  2000
);

// Trigger check on text changes
useEffect(() => {
  if (currentValue !== lastCheckedText) {
    checkStaleness(currentValue);
  }
}, [currentValue, lastCheckedText, checkStaleness]);
```

**Success checks**:
- [ ] Staleness check runs after typing stops
- [ ] Comments marked stale when text deleted
- [ ] Comments marked stale when content changes >70%
- [ ] Database updated with stale flags

### Step 3.6 – Update CommentCard UI for Stale Comments (30 minutes)

**File**: `src/components/comments/CommentCard.tsx`

**Location**: Update badge display (around line 1640)

**Changes**:
```typescript
{/* Show stale warning */}
{comment?.isStale && (
  <Badge variant="warning" className="text-xs mb-2">
    ⚠️ Content changed or deleted
  </Badge>
)}
```

**Success check**: Stale badge appears on affected comments.

### Rollback Strategy for Phase 3

**If comment migration has issues**:

**Option 1 – Disable staleness detection** (fastest):
```typescript
// In NotesEditorDialog.tsx
const ENABLE_STALENESS_CHECK = false; // Feature flag

if (ENABLE_STALENESS_CHECK) {
  checkStaleness(currentValue);
}
```

**Option 2 – Revert migration**:
```bash
# Mark migration as reverted
npx supabase migration repair 20251023000001 --status reverted

# Drop columns manually
psql $DATABASE_URL -c "ALTER TABLE comments DROP COLUMN IF EXISTS original_text_snippet, DROP COLUMN IF EXISTS is_stale;"
```

**Impact**: Comments still work, just without staleness detection.

---

## Phase 4 – Notes & Transcript Dialogs (4-5 hours) ❌ HIGH

### Objective
Create specialized `NotesEditorDialog` and `TranscriptEditorDialog` components that extend the base `TextEditorDialog`.

### Step 4.1 – Refactor NotesEditorDialog (120 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: Refactor to extend `TextEditorDialog` (major rewrite)

**New structure**:
```typescript
import { TextEditorDialog } from '@/components/dialogs/TextEditorDialog';
import { CommentToolbar } from '@/components/comments/CommentToolbar';
import { CommentSidebar } from '@/components/comments/CommentSidebar';

interface NotesEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  isLoading?: boolean;
  resourceId: string;
  onCommentCountChange?: (count: number) => void;
}

export function NotesEditorDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
  isLoading,
  resourceId,
  onCommentCountChange,
}: NotesEditorDialogProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  // ... existing comment state

  return (
    <TextEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Notes"
      description="Write your notes with rich formatting. AI comments and discussions appear in the sidebar."
      initialValue={initialValue}
      onSave={onSave}
      isLoading={isLoading}
      showToolbar={true}
    >
      {/* Additional toolbar for comments */}
      <CommentToolbar
        hasSelection={selectionRange !== null}
        onCreateComment={handleStartCommentCreation}
        onViewResolved={() => setShowResolvedComments(true)}
        unresolvedCount={comments.length}
      />

      {/* Comment sidebar (conditionally rendered) */}
      {comments.length > 0 && (
        <CommentSidebar
          comments={comments}
          activeCommentId={activeCommentId}
          onCommentClick={handleCommentClick}
          onResolve={handleResolveComment}
          onAddReply={handleAddReply}
          // ... other props
        />
      )}
    </TextEditorDialog>
  );
}
```

**Key changes**:
- Extends `TextEditorDialog` instead of custom implementation
- Preserves all comment functionality
- Uses `children` slot for CommentToolbar
- Sidebar rendered conditionally

**Success checks**:
- [ ] Dialog renders without errors
- [ ] Comment system still functional
- [ ] AI Notes Check button appears
- [ ] Save functionality works

### Step 4.2 – Create TranscriptEditorDialog (90 minutes)

**File**: `src/components/TranscriptEditorDialog.tsx` (NEW)

**Implementation**:
```typescript
import { TextEditorDialog } from '@/components/dialogs/TextEditorDialog';

interface TranscriptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  isLoading?: boolean;
}

export function TranscriptEditorDialog({
  open,
  onOpenChange,
  initialValue,
  onSave,
  isLoading,
}: TranscriptEditorDialogProps) {
  return (
    <TextEditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Transcript"
      description="Edit the transcript with rich formatting."
      initialValue={initialValue}
      onSave={onSave}
      isLoading={isLoading}
      showToolbar={true}
    >
      {/* No additional toolbar - simple edit only */}
    </TextEditorDialog>
  );
}
```

**Key features**:
- No comment system
- No AI tools
- Simple WYSIWYG editing only
- Same toolbar as notes (Bold, Italic, etc.)

**Success checks**:
- [ ] Dialog renders without errors
- [ ] Editing works
- [ ] Save functionality works
- [ ] No comment-related UI visible

### Step 4.3 – Test Both Dialogs (30 minutes)

**Test NotesEditorDialog**:
1. Open with existing notes → renders correctly
2. Create comment → appears in sidebar
3. Run AI Notes Check → creates AI comments
4. Save notes → persists to database
5. Close and reopen → comments still visible

**Test TranscriptEditorDialog**:
1. Open with transcript → renders correctly
2. Edit text → formatting works
3. Save transcript → persists to database
4. Verify no comment/AI UI visible

**Success checks**:
- [ ] Both dialogs functional
- [ ] No console errors
- [ ] Smooth user experience

### Rollback Strategy for Phase 4

**If dialog refactoring breaks functionality**:
```bash
# Revert NotesEditorDialog
git checkout HEAD -- src/components/NotesEditorDialog.tsx

# Remove TranscriptEditorDialog
rm src/components/TranscriptEditorDialog.tsx
```

**Impact**: App reverts to old markdown editor, no data loss.

---

## Phase 5 – ResourceDetail Integration (3-4 hours) ❌ HIGH

### Objective
Update `ResourceDetail` page to use new dialog components for both notes and transcripts.

### Step 5.1 – Update Notes Section (60 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: Notes section (around line 833)

**Changes**:
```typescript
// Remove old inline editing, use dialog-only approach

// Add state for dialog
const [showNotesDialog, setShowNotesDialog] = useState(false);

// Notes display section (read-only)
<Card>
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      Notes
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowNotesDialog(true)}
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit Notes
      </Button>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {resource.notes ? (
      <div className="prose max-w-none">
        {/* Render markdown as HTML (read-only preview) */}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {resource.notes}
        </ReactMarkdown>
      </div>
    ) : (
      <p className="text-muted-foreground italic">
        No notes yet. Click "Edit Notes" to add your thoughts.
      </p>
    )}
  </CardContent>
</Card>

{/* Notes Editor Dialog */}
<NotesEditorDialog
  open={showNotesDialog}
  onOpenChange={setShowNotesDialog}
  initialValue={resource.notes || ''}
  onSave={handleSaveNotes}
  isLoading={isUpdating}
  resourceId={resource.id}
/>
```

**Success checks**:
- [ ] "Edit Notes" button opens dialog
- [ ] Notes display as read-only preview
- [ ] Save works and updates display
- [ ] Comment count badge updates

### Step 5.2 – Update Transcript Section (90 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: Transcript section (around line 883)

**Changes**:
```typescript
// Remove old inline textarea, use dialog approach

// Add state for dialog
const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);

// Transcript display section (read-only)
<Card>
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      Transcript
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowTranscriptDialog(true)}
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit Transcript
      </Button>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {resource.transcript ? (
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {resource.transcript}
        </ReactMarkdown>
      </div>
    ) : (
      <p className="text-muted-foreground italic">
        No transcript available.
      </p>
    )}
  </CardContent>
</Card>

{/* Transcript Editor Dialog */}
<TranscriptEditorDialog
  open={showTranscriptDialog}
  onOpenChange={setShowTranscriptDialog}
  initialValue={resource.transcript || ''}
  onSave={handleSaveTranscript}
  isLoading={isUpdating}
/>
```

**Success checks**:
- [ ] "Edit Transcript" button opens dialog
- [ ] Transcript displays as read-only preview
- [ ] Save works and updates display
- [ ] No comment/AI UI visible

### Step 5.3 – Standardize Display Fonts (30 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: Both notes and transcript card content

**Apply consistent styling**:
```typescript
// Both sections use same font classes
<div className="prose max-w-none font-reading text-base leading-relaxed">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {content}
  </ReactMarkdown>
</div>
```

**Success check**: Notes and transcript display with identical fonts and spacing.

### Rollback Strategy for Phase 5

**If integration breaks ResourceDetail**:
```bash
# Revert ResourceDetail
git checkout HEAD -- src/pages/ResourceDetail.tsx
```

**Impact**: Old inline editing returns, but dialogs remain available for future use.

---

## Phase 6 – Metadata Styling Standardization (2-3 hours) ❌ MEDIUM

### Objective
Apply consistent fonts, spacing, and card styling to metadata fields while preserving current functionality.

### Step 6.1 – Standardize Metadata Display Fonts (45 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: Metadata display section (around line 698)

**Apply consistent classes**:
```typescript
// All metadata values use same font
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Title */}
  <div className="space-y-1">
    <Label className="text-sm font-medium">Title</Label>
    <p className="font-reading text-base">{resource.title}</p>
  </div>

  {/* Description */}
  <div className="space-y-1 md:col-span-2">
    <Label className="text-sm font-medium">Description</Label>
    <p className="font-reading text-base leading-relaxed">
      {resource.description}
    </p>
  </div>

  {/* Other fields follow same pattern */}
</div>
```

**Success check**: All metadata fields use `font-reading text-base` classes.

### Step 6.2 – Standardize Metadata Card Styling (45 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: Metadata card (around line 463)

**Apply consistent card styles**:
```typescript
<Card className="border border-border bg-muted/30">
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center justify-between">
      Metadata
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsEditingMetadata(!isEditingMetadata)}
      >
        <Edit className="w-4 h-4 mr-2" />
        {isEditingMetadata ? 'Save' : 'Edit Metadata'}
      </Button>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Metadata grid */}
  </CardContent>
</Card>
```

**Match styling to notes/transcript cards**:
- Same border style
- Same background color
- Same padding/spacing
- Same header button styling

**Success check**: Metadata card visually matches notes and transcript cards.

### Step 6.3 – Keep Description Multi-Line (30 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: Description input in edit mode

**Preserve current behavior**:
```typescript
{/* Description (multi-line textarea) */}
<div className="space-y-1 md:col-span-2">
  <Label htmlFor="description">Description</Label>
  <Textarea
    id="description"
    value={metadataForm.description}
    onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })}
    placeholder="Brief description"
    rows={3}
    className="resize-none font-reading"
  />
</div>
```

**Success check**: Description remains multi-line (3 rows), other fields single-line.

### Rollback Strategy for Phase 6

**If styling changes cause issues**:
```bash
# Revert ResourceDetail
git checkout HEAD -- src/pages/ResourceDetail.tsx
```

**Impact**: Visual styling reverts, no functionality affected.

---

## Phase 7 – Testing & Validation (4-6 hours) ❌ CRITICAL

### Objective
Comprehensive end-to-end testing of all WYSIWYG functionality, comment system migration, and dialog integrations.

### Step 7.1 – Database Validation (30 minutes)

**After comment migration**:
```sql
-- Verify staleness fields added
SELECT
  id,
  body,
  start_offset,
  end_offset,
  original_text_snippet,
  is_stale,
  comment_type
FROM comments
WHERE resource_id = '<test-resource-id>'
  AND comment_type = 'selected-text'
ORDER BY created_at DESC;

-- Check for orphaned comments
SELECT COUNT(*) as orphaned_count
FROM comments
WHERE is_stale = true
  AND comment_type = 'selected-text';
```

**Expected results**:
- All selected-text comments have originalTextSnippet
- is_stale flags accurate
- No orphaned comments (unless text actually deleted)

### Step 7.2 – Manual QA Checklist (120 minutes)

**Notes Dialog Testing**:
- [ ] Open notes dialog → WYSIWYG editor appears
- [ ] Type `**bold**` → renders as bold (markdown shortcut)
- [ ] Click Bold button → text becomes bold
- [ ] Use Ctrl+B → text becomes bold
- [ ] Create comment → appears in sidebar
- [ ] Edit text within comment → offset extends
- [ ] Delete comment text → comment marked stale
- [ ] Save notes → persists to database
- [ ] Reopen → notes render correctly
- [ ] Run AI Notes Check → AI comments created with rainbow borders

**Transcript Dialog Testing**:
- [ ] Open transcript dialog → WYSIWYG editor appears
- [ ] Formatting works (Bold, Italic, Headings)
- [ ] No comment UI visible
- [ ] No AI tools visible
- [ ] Save transcript → persists to database
- [ ] Reopen → transcript renders correctly

**ResourceDetail Testing**:
- [ ] Notes display as read-only preview
- [ ] "Edit Notes" button opens dialog
- [ ] Transcript displays as read-only preview
- [ ] "Edit Transcript" button opens dialog
- [ ] Metadata fonts consistent with notes/transcript
- [ ] All cards have matching styling

**Comment Staleness Testing**:
- [ ] Create comment on selected text
- [ ] Delete 50% of text → comment NOT stale
- [ ] Delete 80% of text → comment BECOMES stale
- [ ] Delete all text → comment marked stale + orphaned badge
- [ ] Undo deletion → comment recovers from stale
- [ ] Stale badge visible on affected comments

**Markdown Round-Trip Testing**:
- [ ] Enter markdown → saves as markdown
- [ ] Reload → markdown renders correctly
- [ ] Edit in WYSIWYG → markdown preserved
- [ ] Complex markdown (lists, tables, code) → preserved

### Step 7.3 – Performance Testing (60 minutes)

**Benchmarks**:
- [ ] Large note (5000 words) → editor loads in <2 seconds
- [ ] 50+ comments → sidebar scrolls smoothly
- [ ] Typing → no lag (60fps maintained)
- [ ] Save operation → completes in <500ms
- [ ] Staleness check → runs in background without UI freeze

**If performance degrades**:
1. Check TipTap bundle size impact
2. Profile React re-renders
3. Optimize comment staleness check frequency

### Step 7.4 – Build & Quality Checks (30 minutes)

**Commands**:
```bash
# TypeScript check
npm run build

# Lint check
npm run lint

# Type generation (if Supabase types updated)
npx supabase gen types typescript --linked
```

**Success checks**:
- [ ] Build passes without errors
- [ ] No linting errors
- [ ] No type mismatches
- [ ] Bundle size acceptable (<200 KB increase)

### Rollback Strategy for Phase 7

**If critical issues found**:
- Document issues in GitHub issues
- Use feature flag to disable WYSIWYG (revert to old markdown editor)
- Address issues before re-enabling
- Rollback database migration if staleness fields cause problems

---

## Phase 8 – Database Migration & Deployment (2-3 hours) ❌ HIGH

### Objective
Apply database migrations, deploy frontend changes, and monitor initial usage.

### Step 8.1 – Pre-Deployment Checklist (30 minutes)

**Verify**:
- [ ] All code changes committed
- [ ] Database migration created: `supabase/migrations/20251023000001_add_comment_staleness_fields.sql`
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Types regenerated: `npx supabase gen types typescript --linked`

### Step 8.2 – Apply Database Migration (30 minutes)

**Commands**:
```bash
# Backup current database
npx supabase db dump --data-only --file backups/pre_wysiwyg_migration_$(date +%Y%m%d).sql

# Apply migration
npx supabase db push

# Verify migration applied
npx supabase migration list

# Regenerate types
npx supabase gen types typescript --linked > src/types/supabase-generated.ts
```

**Validation**:
```sql
-- Verify columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'comments'
  AND column_name IN ('original_text_snippet', 'is_stale');
```

**Success checks**:
- [ ] Migration applied without errors
- [ ] Columns visible in database
- [ ] Types regenerated
- [ ] No breaking changes to existing comments

### Step 8.3 – Deploy to Production (60 minutes)

**Steps**:
1. Push to `main` branch (triggers Vercel auto-deploy)
   ```bash
   git push origin main
   ```
2. Wait for Vercel deployment to complete
3. Verify production URL loads without errors
4. Run smoke test in production:
   - Open resource with notes
   - Click "Edit Notes"
   - Verify WYSIWYG editor appears
   - Make a test edit
   - Save and verify persistence

**Success checks**:
- [ ] Production site loads
- [ ] WYSIWYG editor works
- [ ] No console errors
- [ ] Existing notes render correctly
- [ ] Comment system still functional

### Step 8.4 – Monitor Initial Usage (30 minutes)

**Check**:
1. Supabase database logs for errors
2. Comment staleness detection working
3. User reports (if any)
4. Browser console errors (check different browsers)

**Metrics to track**:
- Number of stale comments detected per day
- WYSIWYG editor performance (load time)
- User engagement with formatting toolbar
- Any migration issues with existing comments

**If issues arise**:
- Check database logs for staleness query performance
- Check browser console for TipTap errors
- Verify comment offsets still accurate
- Roll back if critical issues found

### Rollback Strategy for Phase 8

**Emergency rollback**:

**Option 1 – Feature flag disable** (fastest):
```typescript
// In WYSIWYGEditor.tsx
const ENABLE_WYSIWYG = false; // Feature flag

if (!ENABLE_WYSIWYG) {
  return <MarkdownField {...props} />; // Fallback to old editor
}
```

**Option 2 – Git revert** (clean):
```bash
git revert <commit-hash>
git push origin main
```

**Option 3 – Database rollback** (preserve data):
```sql
-- Remove staleness columns (preserves comments)
ALTER TABLE comments
  DROP COLUMN IF EXISTS original_text_snippet,
  DROP COLUMN IF EXISTS is_stale;
```

**Impact**: Reverts to old markdown editor, all data preserved.

---

## Testing Checklist (Comprehensive)

### Component Testing
- [ ] WYSIWYGEditor renders without errors
- [ ] EditorToolbar buttons work
- [ ] Markdown shortcuts work (type `**bold**`)
- [ ] Keyboard shortcuts work (Ctrl+B, Ctrl+I)
- [ ] Read-only mode prevents editing
- [ ] TextEditorDialog opens/closes correctly
- [ ] NotesEditorDialog preserves comment system
- [ ] TranscriptEditorDialog has no comment UI

### Integration Testing
- [ ] Notes editor opens from ResourceDetail
- [ ] Transcript editor opens from ResourceDetail
- [ ] Save functionality persists to database
- [ ] Comment creation still works in notes
- [ ] AI Notes Check still functional
- [ ] Staleness detection triggers correctly
- [ ] Stale badge appears on affected comments

### Database Testing
- [ ] Migration applies without errors
- [ ] Staleness columns populated correctly
- [ ] RLS policies still enforced
- [ ] Comment queries perform well (no slow queries)

### Performance Testing
- [ ] Large notes (5000+ words) load quickly
- [ ] Typing has no lag
- [ ] Comment sidebar scrolls smoothly
- [ ] Staleness check doesn't freeze UI
- [ ] Bundle size increase acceptable

### Regression Testing
- [ ] Existing comments still visible
- [ ] Old markdown notes render correctly
- [ ] AI comments still have rainbow borders
- [ ] Resolve comment workflow still works
- [ ] Other resource types unaffected (books, articles)

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces editor changes
- [ ] Focus management correct
- [ ] Toolbar buttons have aria-labels

---

## Rollback Strategy (Overall)

### Emergency Rollback (All Phases)

**Option 1 – Feature Flag Disable** (Fastest):
```typescript
// In WYSIWYGEditor.tsx
const ENABLE_WYSIWYG = false;

if (!ENABLE_WYSIWYG) {
  return <MarkdownField {...props} />;
}
```

**Option 2 – Git Revert** (Clean):
```bash
# Find WYSIWYG-related commits
git log --oneline --grep="WYSIWYG"

# Revert commits in reverse order
git revert <commit-hash>
git push origin main
```

**Option 3 – Database Rollback** (Preserve Data):
```sql
-- Remove staleness fields
ALTER TABLE comments
  DROP COLUMN IF EXISTS original_text_snippet,
  DROP COLUMN IF EXISTS is_stale;
```

**Impact**: Reverts to old markdown editor, notes editing unaffected, all user data preserved.

---

## Deliverables Checklist

### Dependencies
- [ ] TipTap packages installed and tested
- [ ] Turndown (HTML → Markdown) installed
- [ ] Marked (Markdown → HTML) installed

### Components
- [ ] `WYSIWYGEditor.tsx` created and functional
- [ ] `EditorToolbar.tsx` created with formatting buttons
- [ ] `TextEditorDialog.tsx` base component created
- [ ] `NotesEditorDialog.tsx` refactored to use base
- [ ] `TranscriptEditorDialog.tsx` created
- [ ] `CommentCard.tsx` updated for stale badges

### Database
- [ ] Staleness migration created
- [ ] Migration applied to production
- [ ] Types regenerated

### Utilities
- [ ] `commentStalenessDetection.ts` created
- [ ] Staleness check integrated into NotesEditorDialog

### Storage Adapter
- [ ] `createComment` updated to store snippet
- [ ] `updateComment` supports isStale flag

### Pages
- [ ] `ResourceDetail.tsx` updated for both dialogs
- [ ] Read-only previews implemented
- [ ] Metadata styling standardized

### Testing
- [ ] Manual QA checklist completed
- [ ] Performance benchmarks measured
- [ ] Build and lint checks passed
- [ ] Regression tests passed

### Documentation
- [ ] Implementation plan completed (this document)
- [ ] CLAUDE.md updated with TipTap patterns
- [ ] Code comments added for complex logic

### Deployment
- [ ] Database migration applied to production
- [ ] Frontend deployed (Vercel auto-deploy)
- [ ] Smoke test passed in production
- [ ] Monitoring in place

---

## Summary

**Feature**: WYSIWYG editor standardization using TipTap for notes and transcripts, with ProseMirror-based comment position tracking and simple staleness detection.

**Current State**: Ready for implementation. TipTap selected after comprehensive research, architecture validated against existing comment system.

**Approach**:
1. **Foundation**: Install TipTap → Build base WYSIWYG component
2. **Architecture**: Create base dialog → Specialized variants (notes + transcript)
3. **Migration**: Migrate comment system → ProseMirror positions + staleness
4. **Integration**: Update ResourceDetail → Standardize metadata styling
5. **Validation**: Test → Deploy → Monitor

**Impact**:
- **User Experience**: True WYSIWYG editing, consistent UI across text fields, markdown shortcuts + toolbar buttons
- **Technical Debt**: Reduces duplication (base dialog), improves comment resilience (ProseMirror tracking)
- **AI Compatibility**: Preserves markdown storage for AI features
- **Performance**: ~120 KB bundle increase (TipTap + ProseMirror), acceptable for feature richness
- **Reliability**: Automatic comment position tracking, simple staleness detection

**User Value**: Very High (professional editing experience, unified UI, robust comment system)

**Risk Level**: Medium
- TipTap integration with existing comment system
- Comment migration from character offsets to ProseMirror positions
- Markdown round-trip conversion accuracy
- Bundle size impact on mobile performance

**Dependencies**:
- TipTap v2+ with ProseMirror
- Existing comment system (verified operational)
- NotesEditorDialog with markdown editing (verified)
- Supabase database migrations

**Estimated Effort**: 30-40 hours across 8 focused implementation phases (~5-7 days)

**Next Steps**:
1. START: Phase 0 (Research & Dependencies) - CRITICAL
2. THEN: Phase 1 (TipTap Editor Component) - CRITICAL
3. THEN: Phase 2 (Base Dialog Architecture) - HIGH
4. CONTINUE: Phases 3-8 in sequence

---

*Document Version: 1.0*
*Created: 2025-10-23*
*Status: Ready for Implementation*
*Branch: `standardize-notes-and-transcript-text-boxes`*
