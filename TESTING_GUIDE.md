# Testing Guide - Auto-Save & Navigation Protection

## Quick Start

```bash
npm run dev
# Open http://localhost:2222
```

---

## What to Test

### ✅ Metadata Dialog (NEW!)

**Before**: Inline editing that toggled edit/view modes
**Now**: Opens in a dialog (like Notes/Transcript)

**How to test**:
1. Navigate to any resource detail page
2. Click **"Edit"** button on the Metadata card
3. **Expected**: Dialog opens (not inline editing)
4. Edit the title field
5. Wait 60 seconds (or click Save)
6. **Expected**: Auto-save triggers

**Console logs you should see**:
```
[MetadataEditorDialog] Syncing latest metadata before saving your changes...
[useAutoSave] Starting save attempt 1/6
[useUnloadProtection] Enabling browser unload protection
[useAutoSave] Save successful, value synced
[useUnloadProtection] Disabling browser unload protection
[MetadataEditorDialog] Sync completed for saving your changes.
```

---

### ✅ Navigation Protection (NEW!)

**What it does**: Prevents navigation away from page with unsaved changes

**How to test**:
1. Open metadata dialog (or notes/transcript)
2. Edit any field (type some text)
3. **Without clicking Save**, try to:
   - Click browser back button
   - Click a different link
   - Type a new URL in address bar
4. **Expected**: Navigation is blocked until auto-save completes

**Console logs you should see**:
```
[useNavigationBlocker] Navigation blocked, flushing auto-save...
[useAutoSave] Starting save attempt 1/6
[useAutoSave] Save successful, value synced
[useNavigationBlocker] Auto-save flushed, proceeding with navigation
```

**What you should NOT see**:
```
❌ [useNavigationBlocker] Router navigator does not support blocking
```
(This warning was fixed - if you see it, something is wrong!)

---

### ✅ Browser Unload Protection (NEW!)

**What it does**: Prevents tab close during active save

**How to test**:
1. Open metadata dialog
2. Edit any field
3. Click Save (or wait for auto-save to trigger)
4. **During the save** (while you see "Saving..."), try to:
   - Close the tab (Cmd/Ctrl+W)
   - Refresh the page (Cmd/Ctrl+R)
   - Close the browser window
5. **Expected**: Browser shows native warning dialog:
   > "You have unsaved changes. Are you sure you want to leave?"

**Console logs you should see**:
```
[useUnloadProtection] Enabling browser unload protection
... (save completes) ...
[useUnloadProtection] Disabling browser unload protection
```

**Note**: Once save completes, you can close the tab freely (no warning).

---

### ✅ Auto-Save (60s Debounce)

**What it does**: Automatically saves changes 60 seconds after you stop typing

**How to test**:
1. Open any editor (metadata/notes/transcript)
2. Type some text
3. **Stop typing** and wait
4. After ~60 seconds, check console

**Console logs you should see**:
```
[useAutoSave] Starting save attempt 1/6
[useAutoSave] Save successful, value synced
```

**Timing**:
- **Debounce**: 60,000ms (60 seconds)
- If you keep typing, the timer resets
- Once you stop, it waits 60s, then saves

---

### ✅ Retry Logic (Network Errors)

**What it does**: Retries failed saves with exponential backoff

**How to test**:
1. **Disconnect your network** (turn off WiFi)
2. Open any editor and type something
3. Click Save (or wait for auto-save)
4. **Expected**: Multiple retry attempts

**Console logs you should see**:
```
[useAutoSave] Starting save attempt 1/6
[useAutoSave] Save failed (attempt 1): [error message]
[useAutoSave] Retrying in 500ms (attempt 2/6)
[useAutoSave] Starting save attempt 2/6
[useAutoSave] Save failed (attempt 2): [error message]
[useAutoSave] Retrying in 1000ms (attempt 3/6)
[useAutoSave] Starting save attempt 3/6
[useAutoSave] Save failed (attempt 3): [error message]
[useAutoSave] Retrying in 2000ms (attempt 4/6)
[useAutoSave] Starting save attempt 4/6
[useAutoSave] Save failed (attempt 4): [error message]
[useAutoSave] Retrying in 4000ms (attempt 5/6)
[useAutoSave] Starting save attempt 5/6
[useAutoSave] Save failed (attempt 5): [error message]
[useAutoSave] Retrying in 8000ms (attempt 6/6)
[useAutoSave] Starting save attempt 6/6
[useAutoSave] Save failed (attempt 6): [error message]
[useAutoSave] Max retries exhausted, save failed permanently
```

**UI you should see**:
After 5 retries fail, a red error alert appears:
> "Unable to save metadata"
> "Please check your network connection and try again. Your changes are still in the editor."

**Dismiss button**: Click the X to clear the error

---

### ✅ Error Recovery

**What it does**: After errors clear, next save works normally

**How to test**:
1. Cause a save error (disconnect network)
2. Wait for error notification to appear
3. **Reconnect network**
4. Edit any field again
5. Wait 60s or click Save
6. **Expected**: Save succeeds, error clears

**Console logs you should see**:
```
[useAutoSave] Starting save attempt 1/6
[useAutoSave] Save successful, value synced
```

---

### ✅ Lazy Loading

**What it does**: Dialog components only load when you click "Edit"

**How to test**:
1. Open DevTools → Network tab
2. Navigate to a resource detail page
3. **Expected**: You should NOT see requests for:
   - `MetadataEditorDialog-*.js`
   - `NotesEditorDialog-*.js`
   - `TranscriptEditorDialog-*.js`
4. Click "Edit" on Metadata card
5. **Expected**: NOW you see a request for `MetadataEditorDialog-*.js`

**What this proves**: Dialogs load on-demand, not upfront → faster initial page load

---

## Checklist ✅

Go through this checklist to verify everything works:

### Metadata Editing
- [ ] Click "Edit" → dialog opens (not inline)
- [ ] Edit title → auto-saves after 60s
- [ ] Click "Save" → dialog closes immediately
- [ ] Navigate away with unsaved changes → blocked until saved
- [ ] Close tab during save → browser warns

### Notes Editing
- [ ] Click "Edit Notes" → dialog opens
- [ ] Type text → auto-saves after 60s
- [ ] Create comment → comment count updates
- [ ] Click "Save" → dialog closes
- [ ] Navigate away with unsaved changes → blocked
- [ ] Click "AI Notes Check" → flushes auto-save first

### Transcript Editing
- [ ] Click "Edit Transcript" → dialog opens
- [ ] Type text → auto-saves after 60s
- [ ] Click "Save" → dialog closes
- [ ] Only shows for video/short-video types

### Error Handling
- [ ] Disconnect network → retry logic triggers
- [ ] After 5 retries → error notification shows
- [ ] Dismiss error → clears correctly
- [ ] Reconnect → next save succeeds

### Performance
- [ ] Initial page load is fast (dialogs not loaded)
- [ ] Clicking "Edit" loads dialog on-demand
- [ ] No console warnings or errors
- [ ] TypeScript compilation passes
- [ ] ESLint passes
- [ ] Production build works

---

## Common Issues & Solutions

### Issue: Navigation blocker warning

**Symptom**:
```
[useNavigationBlocker] Router navigator does not support blocking
```

**Solution**: This should be fixed. If you see it:
1. Verify React Router version: `npm list react-router-dom`
2. Should be v6.19.0 or higher
3. Check `src/hooks/useNavigationBlocker.ts` uses `useBlocker` (not `unstable_useBlocker`)

---

### Issue: Auto-save not triggering

**Symptom**: Type text, wait 60s, nothing happens

**Debugging**:
1. Open DevTools Console
2. Look for `[useAutoSave]` logs
3. If missing, check:
   - Is dialog actually open? (check `open` prop)
   - Is form valid? (title required for metadata)
   - Check console for errors

---

### Issue: "Unable to save" error appears immediately

**Symptom**: Error shows before any retries

**Debugging**:
1. Check network connection
2. Check Supabase credentials
3. Check console for actual error message
4. Verify storage adapter is working

---

### Issue: Browser doesn't warn on tab close

**Symptom**: Can close tab even during save

**Debugging**:
1. Check `[useUnloadProtection]` logs
2. Verify you're closing during active save (while "Saving..." is visible)
3. Some browsers suppress warnings in dev mode - test in incognito

---

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Click "Edit" on any card | Dialog opens |
| Type in any field | Auto-save after 60s |
| Click "Save" button | Immediate save + close |
| Navigate with unsaved changes | Blocked until saved |
| Close tab during save | Browser warning |
| Network error during save | 5 retries with exponential backoff |
| Retries exhausted | Red error notification |
| Reconnect after error | Next save works |
| Initial page load | Dialogs NOT loaded yet |
| Click "Edit" first time | Dialog loads on-demand |

---

## Performance Targets

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Initial page load | < 2s | DevTools Network tab |
| Dialog open time | < 300ms | Click "Edit", measure feel |
| Auto-save delay | 60s ± 0.5s | Start typing, time it |
| Save request time | < 1s | Check Network tab |
| Retry delays | 500ms, 1s, 2s, 4s, 8s | Check console timestamps |

---

## Success Criteria

You should be able to:
1. ✅ Edit metadata in a dialog (not inline)
2. ✅ Have auto-save work on all three editors
3. ✅ Navigate away safely (auto-save flushes first)
4. ✅ Get browser warning if closing during save
5. ✅ See retry logic in action (disconnect network)
6. ✅ Recover from errors (reconnect network)
7. ✅ See lazy loading in DevTools (dialogs load on-demand)
8. ✅ Have zero console warnings or errors

**If all of the above work → implementation is successful!** 🎉

---

## Still Having Issues?

1. **Check console logs** - They tell you exactly what's happening
2. **Hard refresh** - Cmd/Ctrl+Shift+R to clear cache
3. **Check `npm run typecheck`** - Should pass with zero errors
4. **Check `npm run lint`** - Should pass with zero warnings
5. **Check `npm run build`** - Should build successfully

If everything passes but UI still broken:
- Clear browser cache
- Try incognito mode
- Check Supabase connection
- Verify storage adapter is working

---

**Happy Testing!** 🧪
