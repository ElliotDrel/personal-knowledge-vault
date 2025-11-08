# Auto-Save with Critical Triggers – Implementation Plan

## Overview & Strategy

- **Goal**: Implement silent auto-save for all text editors with 1-second debounce and immediate saves on critical triggers (AI features, dialog close, navigation, browser close).
- **Approach**: Create reusable auto-save hook with retry logic, integrate into all text editor dialogs (Notes, Transcript, Metadata), add critical save triggers before state transitions, and implement network error notifications after retry exhaustion.
- **Guiding principles**: Silent operation (no visual feedback), intelligent retry (5x background / 3x AI-critical), non-blocking user experience, data consistency for AI features, graceful degradation on network failures.

## Current Status (2025-11-07)

**STATUS**: Ready for implementation. Requirements clarified, technical approach validated, existing codebase analyzed.

### Project Context
- **Base Features**: NotesEditorDialog, TranscriptEditorDialog, and TextEditorDialog all exist with explicit save workflows
- **Storage Layer**: Supabase-only storage adapter (no localStorage)
- **Existing Patterns**: `useCommentTextTracking` already implements debounced persistence with flush capability
- **Debounce Library**: `use-debounce@10.0.6` already installed

### Prerequisites Verified
- [x] Text editor dialogs working with explicit save
- [x] Supabase storage adapter operational
- [x] `use-debounce` library installed
- [x] TypeScript strict mode enabled
- [x] No localStorage usage (Supabase-only confirmed)

## Phases & Timeline

| Phase | Focus | Duration | Status | Priority |
|-------|-------|----------|--------|----------|
| 0 | Research & architecture decisions | 1-2 hours | ❌ PENDING | CRITICAL |
| 1 | Create auto-save hook with retry logic | 3-4 hours | ❌ PENDING | CRITICAL |
| 2 | Integrate into NotesEditorDialog | 2-3 hours | ❌ PENDING | HIGH |
| 3 | Integrate into TranscriptEditorDialog | 1-2 hours | ❌ PENDING | HIGH |
| 4 | Integrate into TextEditorDialog (metadata) | 1-2 hours | ❌ PENDING | HIGH |
| 5 | Add navigation protection | 2-3 hours | ❌ PENDING | HIGH |
| 6 | Add browser unload protection | 1-2 hours | ❌ PENDING | MEDIUM |
| 7 | Add network error notifications | 2-3 hours | ❌ PENDING | HIGH |
| 8 | Testing & validation | 3-4 hours | ❌ PENDING | CRITICAL |
| **TOTAL** | **Full implementation** | **~18-26 hours** | | **~3-4 days** |

---

## Phase 0 – Research & Architecture Decisions (1-2 hours) ❌ CRITICAL

### Objective
Analyze existing save patterns, decide on retry strategy implementation, and validate technical approach against codebase standards.

### Prerequisites
- [ ] Working tree clean (commit pending changes)
- [ ] All text editor dialogs identified and documented
- [ ] Existing debounce patterns reviewed

### Step 0.1 – Document Current Save Patterns (30 minutes)

**Files to analyze**:
- `src/components/NotesEditorDialog.tsx` - Notes editor with AI integration and comment tracking
- `src/components/dialogs/TranscriptEditorDialog.tsx` - Transcript editing
- `src/components/dialogs/TextEditorDialog.tsx` - Base dialog for metadata editing
- `src/hooks/use-comment-text-tracking.ts` - Reference for debounce + flush pattern

**Document for each editor**:
1. Current save trigger (explicit button click)
2. Save function signature (`onSave: (value: string) => Promise<void>`)
3. Loading state management (`isLoading` prop or local state)
4. Error handling approach (inline errors vs toast)
5. Parent callback pattern (`onDirtyChange` notifications)

**Success check**: Clear understanding of integration points documented.

### Step 0.2 – Validate Retry Strategy (20 minutes)

**Decision**: Implement exponential backoff with attempt limits
- Background saves: 5 attempts with delays (500ms, 1s, 2s, 4s, 8s)
- AI-critical saves: 3 attempts with delays (500ms, 1s, 2s)
- Network timeout: Inherit from Supabase client (60s per attempt)

**Validation questions**:
- Does exponential backoff fit with user expectations? (YES - standard pattern)
- Should we use linear retry for faster AI feedback? (NO - exponential is safer for network spikes)

**Success check**: Retry strategy documented and justified.

### Step 0.3 – Plan Notification System (30 minutes)

**Check for existing patterns**:
```bash
npx rg "toast|notification|alert" --type tsx --type ts
```

**Decisions**:
- Use existing notification system if available (toast library)
- Otherwise create minimal inline Alert component in dialogs
- Network errors shown only after retry exhaustion
- Success notifications disabled (silent operation per requirements)

**Success check**: Notification approach decided and documented.

### Rollback Strategy for Phase 0
No code changes yet - safe to abandon research if approach invalidated.

---

## Phase 1 – Create Auto-Save Hook with Retry Logic (3-4 hours) ❌ CRITICAL

### Objective
Build reusable `useAutoSave` hook that handles debounced saves, exponential retry, flush on demand, and error state management.

### Step 1.1 – Create Hook File and Interface (30 minutes)

**File**: `src/hooks/useAutoSave.ts` (NEW)

**Interface definition**:
```typescript
interface UseAutoSaveOptions<T> {
  value: T;
  onSave: (value: T) => Promise<void>;
  debounceMs?: number; // Default: 1000ms
  maxRetries?: number; // Default: 5
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isDirty: boolean;
  isSaving: boolean;
  saveError: Error | null;
  retryCount: number;
  flushPendingUpdates: () => Promise<void>;
  clearError: () => void;
}
```

**Design decisions**:
- Generic `<T>` for flexibility (string for text, could extend to objects)
- `flushPendingUpdates()` returns Promise for await in critical triggers
- Expose `retryCount` for debugging visibility
- `clearError()` for manual dismissal after user fixes network

**Success check**: Interface compiles without errors.

### Step 1.2 – Implement Core Auto-Save Logic (90 minutes)

**File**: Same file (`useAutoSave.ts`)

**Implementation approach**:

**State management**:
- Track `isSaving`, `saveError`, `retryCount` with useState
- Store `lastSavedValueRef` with useRef to compute `isDirty`
- Compute `isDirty` as `value !== lastSavedValueRef.current`

**Exponential backoff helper**:
```typescript
const getRetryDelay = (attempt: number) => Math.min(500 * Math.pow(2, attempt), 8000);
```

**Core save function** (`performSave`):
- Accept `valueToSave` and `attemptNumber` parameters
- Set `isSaving` and `retryCount` state before save
- Try `await onSave(valueToSave)`
- On success: update `lastSavedValueRef`, clear error, reset retry count
- On failure: log error, check if `attemptNumber < maxRetries`
  - If yes: wait with exponential delay, recursively call `performSave(value, attemptNumber + 1)`
  - If no: set `saveError` state, throw error
- Always set `isSaving = false` in finally block

**Debounced save trigger**:
- Use `useDebouncedCallback` from `use-debounce` library (already installed)
- Wrap `performSave` call with debounce (1000ms default)
- Catch errors internally (already logged and state updated)

**Auto-trigger effect**:
- Watch `value`, `isDirty`, `enabled` dependencies
- Call `debouncedSave(value)` when value changes and is dirty
- Skip if not enabled or not dirty

**Flush function**:
- Cancel pending debounce with `debouncedSave.cancel()`
- Return early if not dirty (nothing to save)
- Call `performSave(value)` immediately
- Let errors throw to caller (critical triggers need to know)

**Cleanup effect**:
- Call `debouncedSave.flush()` on unmount
- Catch and log any flush errors (fire-and-forget)

**Success checks**:
- [ ] TypeScript compiles without errors
- [ ] Exponential backoff calculation correct
- [ ] Cleanup effect prevents memory leaks

### Step 1.3 – Add Logging for Debugging (20 minutes)

**Add console statements** at key points:
- On save start: `[useAutoSave] Starting save attempt ${attemptNumber + 1}/${maxRetries + 1}`
- On success: `[useAutoSave] Save successful, value synced`
- On retry: `[useAutoSave] Retrying in ${delay}ms (attempt ${attemptNumber + 1})`
- On exhaustion: `[useAutoSave] Max retries exhausted, save failed permanently`

**Success check**: Console logs provide clear debugging trail during testing.

### Step 1.4 – Test Hook in Isolation (40 minutes)

**Manual test approach** (create temporary test component):
1. Import hook with mock save function
2. Simulate typing (update value every 100ms)
3. Verify debounce triggers 1s after last change
4. Mock network error (throw in `onSave`)
5. Verify retry attempts with exponential delays
6. Test `flushPendingUpdates()` cancels debounce
7. Verify error state surfaces correctly

**Success criteria**:
- [ ] Debounce triggers 1s after typing stops
- [ ] Retry delays match exponential pattern
- [ ] Flush cancels debounce and saves immediately
- [ ] Error state set after max retries
- [ ] No performance issues with rapid typing

### Rollback Strategy for Phase 1

**If hook has bugs**:
```bash
rm src/hooks/useAutoSave.ts
```

**Impact**: No integration yet, safe to remove and redesign.

---

## Phase 2 – Integrate into NotesEditorDialog (2-3 hours) ❌ HIGH

### Objective
Replace explicit save button workflow with auto-save in NotesEditorDialog while preserving AI integration and comment tracking flush behavior.

### Step 2.1 – Add Auto-Save Hook to NotesEditorDialog (45 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After existing hooks (around line 96)

**Integration steps**:
1. Import `useAutoSave` from `@/hooks/useAutoSave`
2. Add hook after `useCommentTextTracking` (existing pattern to follow)
3. Destructure return values with `Notes` prefix: `isNotesDirty`, `isNotesSaving`, `flushNotesAutoSave`, etc.
4. Configure options:
   - `value: currentValue` (existing state)
   - `onSave: async (value) => { await flushPendingUpdates(); await onSave(value); }` (flush comments first)
   - `debounceMs: 1000`
   - `maxRetries: 5` (background saves)
   - `enabled: true`

**Success check**: Hook compiles, auto-save triggers on typing.

### Step 2.2 – Update AI Notes Check to Flush First (30 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: AI check mutation function (around line 167)

**Changes**:
1. Before setting `aiCheckState('processing')`, call `await flushNotesAutoSave()` in try/catch
2. If flush fails (catch block):
   - Set `aiCheckState('error')`
   - Throw descriptive error: `"Cannot start AI analysis - please check your network connection and try again"`
3. Only proceed to AI check if flush succeeds

**Critical requirement**: AI blocked if auto-save fails (ensures data consistency).

**Success check**: AI waits for save, shows network error if save fails.

### Step 2.3 – Update Dialog Close to Flush (20 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: Close handler (around line 451)

**Changes**:
1. Use `Promise.all` to flush both comment tracking and auto-save in parallel
2. Wrap in `.catch()` to continue closing even if flush fails (user wants to exit)
3. Keep existing `isDirty` confirmation logic (should be rare with auto-save)

**Success check**: Close triggers immediate save, dialog closes after completion.

### Step 2.4 – Update Explicit Save Button (15 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: Save button handler and UI (around line 437, 554)

**Handler changes**:
- Replace `onSave` call with `flushNotesAutoSave` (should be no-op if already saved)
- Close dialog on success
- Keep dialog open on error for retry

**Button UI changes**:
- `disabled={isNotesSaving}` (not old `isLoading` prop)
- Show spinner when `isNotesSaving` is true
- Text: "Saving..." vs "Save"

**Success check**: Save button reflects auto-save state.

### Step 2.5 – Update Dirty State Callback (10 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After auto-save hook

**Change existing effect** to use auto-save state:
```typescript
useEffect(() => {
  onDirtyChange?.(isNotesDirty);
}, [isNotesDirty, onDirtyChange]);
```

**Success check**: Parent receives dirty state updates from auto-save.

### Rollback Strategy for Phase 2

**Disable auto-save**:
```typescript
enabled: false // in useAutoSave options
```

**Impact**: Dialog reverts to explicit save workflow.

---

## Phase 3 – Integrate into TranscriptEditorDialog (1-2 hours) ❌ HIGH

### Objective
Add auto-save to transcript editing with same behavior as notes (1s debounce, flush on close).

### Step 3.1 – Add Auto-Save to TextEditorDialog (60 minutes)

**File**: `src/components/dialogs/TextEditorDialog.tsx`

**Location**: After state declarations (around line 55)

**Integration steps** (same pattern as NotesEditorDialog):
1. Import and add `useAutoSave` hook
2. Destructure with `Content` prefix: `isContentDirty`, `isContentSaving`, `flushContentAutoSave`
3. Configure: `value: currentValue`, `onSave`, `debounceMs: 1000`, `maxRetries: 5`

**Update close handler**:
- Call `flushContentAutoSave()` before checking dirty state
- Catch errors to allow close on failure

**Update save button**:
- Replace `onSave` with `flushContentAutoSave`
- Use `isContentSaving` for disabled state and spinner

**Success check**: Transcript dialog auto-saves same as notes.

### Rollback Strategy for Phase 3

Same as Phase 2 - feature flag disable.

---

## Phase 4 – Integrate into Metadata Editing (1-2 hours) ❌ HIGH

### Objective
Add auto-save to metadata inline editing fields (description, title, etc.) in ResourceDetail.

### Step 4.1 – Analyze Metadata Editing Pattern (20 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: Metadata edit mode (around line 106)

**Current pattern**:
- Metadata stored in `metadataForm` state object (multiple fields)
- Explicit save via "Save Metadata" button
- No debouncing currently

**Decision**: Wrap entire form object in auto-save, flush on save button or blur.

**Success check**: Metadata editing pattern documented.

### Step 4.2 – Add Auto-Save for Metadata Form (50 minutes)

**File**: `src/pages/ResourceDetail.tsx`

**Location**: After metadata state (around line 124)

**Integration steps**:
1. Import and add `useAutoSave` hook
2. Destructure with `Metadata` prefix
3. Configure:
   - `value: metadataForm` (entire object)
   - `onSave: async (formData) => { /* convert to resource update */ }`
   - `enabled: isEditingMetadata` (only auto-save while editing)

**onSave implementation**:
- Extract fields from `formData`
- Convert tags string to array (split, trim, filter)
- Call `storageAdapter.updateResource(resource.id, updates)`
- Update `metadataLastSavedAt` timestamp
- Call `upsertResource(result)` to sync parent state

**Update save button**:
- Call `flushMetadataAutoSave()` instead of inline save logic
- Exit edit mode on success

**Success check**: Metadata auto-saves while editing.

### Rollback Strategy for Phase 4

Feature flag disable or revert file.

---

## Phase 5 – Add Navigation Protection (2-3 hours) ❌ HIGH

### Objective
Prevent navigation away from unsaved content by blocking route changes until auto-save completes.

### Step 5.1 – Research React Router Blocking (30 minutes)

**Check router version**:
```bash
npm list react-router-dom
```

**Implementation options by version**:
- v6.4+: `useBlocker` hook (stable API)
- v6.0-6.3: `unstable_useBlocker` hook
- v5: `<Prompt>` component

**Decision**: Use appropriate API for detected version.

**Success check**: Router blocking API identified and documented.

### Step 5.2 – Implement Navigation Blocker Hook (60 minutes)

**File**: `src/hooks/useNavigationBlocker.ts` (NEW)

**Interface**:
```typescript
interface UseNavigationBlockerOptions {
  when: boolean;
  onBlock: () => Promise<void>;
}
```

**Implementation approach**:
- Call `useBlocker` (or version-appropriate API) with callback checking `when` condition
- Watch for `blocker.state === 'blocked'`
- When blocked: call `onBlock()` async function
- On success: call `blocker.proceed()` to allow navigation
- On error: call `blocker.reset()` to cancel block and allow navigation
- Wrap in useEffect watching `blocker` and `onBlock`

**Success check**: Hook compiles and blocks navigation when `when=true`.

### Step 5.3 – Integrate into NotesEditorDialog (30 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After auto-save hook

**Add hook call**:
```typescript
useNavigationBlocker({
  when: isNotesDirty && open,
  onBlock: flushNotesAutoSave,
});
```

**Success check**: Navigating away triggers auto-save first.

### Step 5.4 – Integrate into Other Dialogs (20 minutes)

**Files**: TextEditorDialog, ResourceDetail (metadata)

**Same pattern**: Add `useNavigationBlocker` with dialog-specific:
- `when` condition (dirty + open/editing)
- `onBlock` flush function

**Success check**: All editors block navigation until saved.

### Rollback Strategy for Phase 5

**Disable blocking**:
```typescript
when: false && isNotesDirty && open
```

---

## Phase 6 – Add Browser Unload Protection (1-2 hours) ❌ MEDIUM

### Objective
Prevent browser tab close or refresh during active save operations.

### Step 6.1 – Implement Unload Protection Hook (45 minutes)

**File**: `src/hooks/useUnloadProtection.ts` (NEW)

**Interface**:
```typescript
interface UseUnloadProtectionOptions {
  when: boolean;
  message?: string;
}
```

**Implementation approach**:
- Create `beforeunload` event handler in useEffect
- Handler sets `event.preventDefault()` and `event.returnValue = message`
- Add listener when `when=true`, remove on cleanup or when `when=false`

**Success check**: Browser shows confirmation on tab close when active.

### Step 6.2 – Integrate into Dialogs (30 minutes)

**All text editor dialogs**:

**Pattern**:
```typescript
useUnloadProtection({
  when: isSaving, // Only during active save
});
```

**Success check**: Closing tab during save shows browser warning.

### Rollback Strategy for Phase 6

Remove `useUnloadProtection` calls - safe fallback.

---

## Phase 7 – Add Network Error Notifications (2-3 hours) ❌ HIGH

### Objective
Show user-friendly error notifications after retry exhaustion.

### Step 7.1 – Research Notification System (20 minutes)

**Search for existing patterns**:
```bash
npx rg "toast|notification|alert" --type tsx --files-with-matches
```

**Decisions**:
- If toast library exists: Use it
- Otherwise: Create minimal inline Alert component

**Success check**: Notification approach decided.

### Step 7.2 – Create Notification Component (45 minutes)

**Option A**: If toast exists, skip to Step 7.3

**Option B**: Create inline alert

**File**: `src/components/ui/inline-alert.tsx` (NEW)

**Component structure**:
- Use existing `Alert`, `AlertTitle`, `AlertDescription` from shadcn/ui
- Add `AlertCircle` icon from lucide-react
- Add dismiss button with `X` icon
- Support `variant` prop (destructive, warning)
- Call `onDismiss` callback when X clicked

**Success check**: Component renders with dismissible error.

### Step 7.3 – Add Error Display to NotesEditorDialog (40 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: After DialogHeader (around line 491)

**Conditional render**:
- Show when `notesSaveError && retryCount >= maxRetries`
- Title: "Unable to save your work"
- Message: "Please check your network connection and try again. Your changes are still in the editor."
- Variant: "destructive"
- onDismiss: `clearNotesSaveError`

**Success check**: Error appears after 5 retries, dismissible.

### Step 7.4 – Add Error Display to Other Dialogs (30 minutes)

**Files**: TranscriptEditorDialog, TextEditorDialog, ResourceDetail

**Same conditional pattern** with dialog-specific error state.

**Success check**: All editors show consistent network errors.

### Rollback Strategy for Phase 7

Remove `InlineAlert` from render - auto-save continues working silently.

---

## Phase 8 – Testing & Validation (3-4 hours) ❌ CRITICAL

### Objective
Comprehensive end-to-end testing of auto-save, retries, critical triggers, and error handling.

### Step 8.1 – Manual Test Scenarios (90 minutes)

**Auto-Save Debounce Testing**:
- [ ] Open notes, type "hello world", wait 1s
- [ ] Check Supabase dashboard - verify row updated
- [ ] Verify no visual feedback shown (silent)

**Critical Trigger Testing**:
- [ ] Type → click Save → verify flush before close
- [ ] Type → close dialog → verify flush before close
- [ ] Type → run AI Check → verify flush before AI
- [ ] Type → navigate away → verify block until saved
- [ ] Type during save → close tab → verify browser warning

**Retry Logic Testing**:
- [ ] Disconnect network → type → wait 1s
- [ ] Check console for 5 retry attempts (500ms, 1s, 2s, 4s, 8s)
- [ ] Verify error notification after attempt 5
- [ ] Reconnect → verify next save succeeds

**AI-Critical Retry Testing**:
- [ ] Disconnect network → type → click AI Check immediately
- [ ] Verify only 3 retry attempts (not 5)
- [ ] Verify AI blocked with network error message

**Metadata Auto-Save Testing**:
- [ ] Edit title → wait 1s → check database
- [ ] Edit title → click Save immediately → verify flush

**Transcript Auto-Save Testing**:
- [ ] Edit transcript → wait 1s → check database
- [ ] Edit → close immediately → verify flush

**Error Dismissal Testing**:
- [ ] Trigger error → see notification → dismiss
- [ ] Type again → verify notification doesn't reappear

### Step 8.2 – Performance Testing (30 minutes)

**Scenarios**:
- [ ] Large note (10,000+ chars) + rapid typing → no lag
- [ ] Multiple editors open → verify independent saves
- [ ] Verify debounce prevents excessive API calls

**Benchmarks**:
- Auto-save response: <100ms (debounce start)
- Retry delays: Match exponential pattern
- Memory: No leaks on open/close cycles

**Success criteria**:
- [ ] Typing remains smooth (60fps)
- [ ] Console logs show correct retry timing

### Step 8.3 – Build & Quality Checks (30 minutes)

**Commands**:
```bash
npm run build  # TypeScript check
npm run lint   # Code quality
npm run dev    # Local test
```

**Success checks**:
- [ ] Build passes
- [ ] No lint errors
- [ ] No console warnings in production
- [ ] All TypeScript strict checks pass

### Step 8.4 – Browser Compatibility Testing (30 minutes)

**Test in each browser**:
- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Edge: All features work
- [ ] Unload warning shows in all

### Rollback Strategy for Phase 8

**If critical bugs found**:

**Option 1** - Feature flag disable:
```typescript
const ENABLE_AUTO_SAVE = false;
```

**Option 2** - Git revert:
```bash
git log --oneline --grep="auto-save"
git revert <commit-hash>
```

---

## Testing Checklist (Comprehensive)

### Functional Testing
- [ ] Auto-save triggers 1s after typing stops
- [ ] Auto-save does not trigger if no changes
- [ ] Auto-save flushes on Save button click
- [ ] Auto-save flushes on dialog close
- [ ] Auto-save flushes before AI Notes Check
- [ ] Auto-save flushes before navigation
- [ ] Browser warns on tab close during save
- [ ] Network errors retry 5x for background
- [ ] Network errors retry 3x for AI-triggered
- [ ] Error notification after retry exhaustion
- [ ] Error notification dismissible
- [ ] Successful save clears previous errors

### Integration Testing
- [ ] Notes editor auto-saves with comment flush
- [ ] Transcript editor auto-saves independently
- [ ] Metadata editor auto-saves in edit mode
- [ ] Multiple editors don't interfere
- [ ] AI waits for save completion
- [ ] AI blocked if save fails
- [ ] Dirty state surfaces to parent
- [ ] Comment count updates after AI (preserved)

### Performance Testing
- [ ] Large notes (10K+ chars) no lag
- [ ] Rapid typing doesn't over-save
- [ ] Retry delays match exponential pattern
- [ ] No memory leaks on cycles
- [ ] Typing smooth during auto-save

### Error Handling Testing
- [ ] Network disconnect triggers retry
- [ ] Retry exhaustion shows notification
- [ ] Error persists until dismissed/success
- [ ] AI blocked with clear error message
- [ ] Navigation shows user-friendly message

### Browser Compatibility Testing
- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work
- [ ] Edge: All features work
- [ ] Unload warning shows consistently

---

## Rollback Strategy (Overall)

### Emergency Rollback (All Phases)

**Option 1 – Feature Flag Disable** (Fastest):
```typescript
// In useAutoSave.ts
const ENABLE_AUTO_SAVE = false;

export function useAutoSave<T>(options: UseAutoSaveOptions<T>) {
  if (!ENABLE_AUTO_SAVE) {
    return { isDirty: false, isSaving: false, /* ... stubs */ };
  }
  // ... rest
}
```

**Option 2 – Git Revert** (Clean):
```bash
git log --oneline --grep="auto-save"
git revert <commit-3> <commit-2> <commit-1>
git push origin main
```

**Option 3 – Partial Rollback** (Surgical):
```bash
# Revert specific integrations, keep hook
git checkout HEAD -- src/components/NotesEditorDialog.tsx
git checkout HEAD -- src/components/dialogs/TextEditorDialog.tsx
```

**Impact**: App reverts to explicit save, no data loss, features preserved.

---

## Deliverables Checklist

### Core Hook
- [ ] `src/hooks/useAutoSave.ts` created
- [ ] Generic type support
- [ ] Exponential retry logic
- [ ] Debounce with flush
- [ ] Error state management
- [ ] Cleanup on unmount

### Integration Files
- [ ] `src/components/NotesEditorDialog.tsx` updated
- [ ] `src/components/dialogs/TextEditorDialog.tsx` updated
- [ ] `src/components/dialogs/TranscriptEditorDialog.tsx` updated
- [ ] `src/pages/ResourceDetail.tsx` updated (metadata)

### Protection Hooks
- [ ] `src/hooks/useNavigationBlocker.ts` created
- [ ] `src/hooks/useUnloadProtection.ts` created
- [ ] All editors integrated with protection

### UI Components
- [ ] `src/components/ui/inline-alert.tsx` created (if needed)
- [ ] Error notifications in all editors
- [ ] Dismissible error UI

### Testing
- [ ] Manual test scenarios completed
- [ ] Performance benchmarks met
- [ ] Browser compatibility verified
- [ ] Build and lint passed

### Documentation
- [ ] Implementation plan (this document)
- [ ] CLAUDE.md updated with patterns
- [ ] Code comments for complex logic
- [ ] Rollback procedures documented

---

## Summary

**Feature**: Silent auto-save with 1-second debounce and intelligent retry logic for all text editors, with immediate saves on critical triggers (AI, close, navigation).

**Current State**: Ready for implementation. Requirements clarified, technical approach validated, existing patterns analyzed.

**Approach**:
1. **Foundation**: Build reusable auto-save hook with retry + flush
2. **Integration**: Add to all text editors (notes, transcript, metadata)
3. **Protection**: Block navigation and browser close during saves
4. **Feedback**: Show errors only after retry exhaustion
5. **Validation**: Comprehensive testing across scenarios and browsers

**Impact**:
- **User Experience**: Seamless editing, no manual save needed, data loss prevention
- **AI Compatibility**: Latest version always available (critical trigger ensures sync)
- **Technical Debt**: Reduced (unified save mechanism)
- **Performance**: Minimal impact (debounced, no visual overhead)
- **Reliability**: High (5-attempt retry with backoff, graceful degradation)

**User Value**: Very High (prevents data loss, reduces friction, ensures AI accuracy)

**Risk Level**: Low-Medium
- Hook testing critical to prevent save loops
- Network error handling must be robust
- Navigation blocking needs careful UX testing

**Dependencies**: `use-debounce@10.0.6` (installed), React Router (version-specific API)

**Estimated Effort**: 18-26 hours across 8 phases (~3-4 days)

**Next Steps**:
1. START: Phase 0 (Research & Architecture) - CRITICAL
2. THEN: Phase 1 (Auto-Save Hook) - CRITICAL
3. THEN: Phases 2-4 (Editor Integrations) - HIGH
4. THEN: Phases 5-7 (Protection & Notifications) - MEDIUM-HIGH
5. FINALLY: Phase 8 (Testing & Validation) - CRITICAL

---

*Document Version: 2.0*
*Created: 2025-11-07*
*Updated: 2025-11-07*
*Status: Ready for Implementation*
