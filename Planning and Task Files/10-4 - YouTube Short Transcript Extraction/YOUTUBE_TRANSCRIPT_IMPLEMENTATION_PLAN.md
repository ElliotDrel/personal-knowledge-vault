# YouTube Transcript Extraction — Minimal Implementation Plan

## Overview
**Goal**: Add automatic transcript extraction for YouTube Shorts using existing infrastructure.

**Key Insight**: All infrastructure already exists (database fields, processing workflow, UI display). We just need to activate the stubbed transcript extraction logic.

**Estimated Time**: 2-3 hours implementation + testing

## What Changed (Based on Code Review)

This plan has been updated to address critical issues identified in code review:

1. ✅ **Environment Config**: Changed default to ON (not OFF) - feature attempts transcripts by default
2. ✅ **Language Fallback**: Added fallback logic (English → auto-selected → none)
3. ✅ **Warning Messages**: Updated to be accurate (removed "not yet implemented" text)
4. ✅ **Test Validation**: Added database validation queries to testing
5. ✅ **Library Verified**: Confirmed `youtube-caption-extractor` works in Deno with sample YouTube Shorts

**Philosophy**: Try to extract transcript, gracefully leave field blank if unavailable.

---

## Implementation Steps

### Step 1: Add Library Dependency (5 minutes)

**File**: `supabase/functions/short-form/deno.json`

**Action**: Add `youtube-caption-extractor` to imports

**Why**: Provides edge-optimized caption extraction (no OAuth required, works in Deno)

**Expected Structure**:
```json
{
  "imports": {
    "youtube-caption-extractor": "npm:youtube-caption-extractor@latest"
  }
}
```

**Success Check**: Deno resolves import without errors

---

### Step 2: Implement Extraction Function (30 minutes)

**File**: `supabase/functions/short-form/extractors/youtube.ts`

**Location**: Lines 356-366 (replace existing stub function)

**What to Implement**:
1. Import `getSubtitles` from library
2. Try English captions first, fall back to auto-selected language
3. Concatenate subtitle text segments into single string
4. Return transcript string or `undefined` on failure
5. Add accurate logging (start, success, warning, error)
6. Update warning messages to remove "not yet implemented" text

**Conceptual Flow**:
```typescript
// Import at top of file
import { getSubtitles } from 'youtube-caption-extractor'

// Replace stub function (lines 356-366)
async function extractYouTubeTranscript(videoId, config) {
  try {
    logInfo('Extracting YouTube transcript', { videoId })

    // Try English first
    let subtitles = await getSubtitles({ videoID: videoId, lang: 'en' })
      .catch(() => null)

    // If no English, try auto-selected language (library default)
    if (!subtitles || subtitles.length === 0) {
      logInfo('No English captions, trying auto-selected language', { videoId })
      subtitles = await getSubtitles({ videoID: videoId })
        .catch(() => null)
    }

    if (!subtitles || subtitles.length === 0) {
      logWarn('No captions available for video', { videoId })
      return undefined
    }

    // Join all subtitle text
    const transcript = subtitles.map(s => s.text).join(' ').trim()

    logInfo('Successfully extracted transcript', {
      videoId,
      length: transcript.length,
      subtitleCount: subtitles.length
    })

    return transcript

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logError('Transcript extraction failed', { videoId, error: message })
    return undefined  // Graceful degradation
  }
}
```

**Also Update Warning Messages**:
Search for any existing warnings that say "Transcript extraction not yet implemented" and update them:
- When feature disabled: "Transcript extraction disabled via configuration"
- When no captions: "No captions available for this video"
- When error: "Transcript extraction failed: [error]"

**Key Points**:
- Never throw exceptions (return `undefined` on failure)
- Always log what happened (success/warning/error)
- Transcript is optional; failures don't block processing
- Language fallback: English → auto-selected → none

**Success Check**: Function compiles without TypeScript errors

---

### Step 3: Configure Feature Flag to Default ON (2 minutes)

**File**: `supabase/functions/short-form/index.ts`

**Location**: Line ~61 (in `getConfig()` function)

**Action**: Change environment variable logic to default to ON (enabled) instead of OFF

**Current**:
```typescript
enableYouTubeTranscripts: Deno.env.get('ENABLE_YOUTUBE_TRANSCRIPTS') === 'true',
// Defaults to false (only ON if env var explicitly 'true')
```

**After**:
```typescript
enableYouTubeTranscripts: Deno.env.get('ENABLE_YOUTUBE_TRANSCRIPTS') !== 'false',
// Defaults to true (only OFF if env var explicitly 'false')
```

**Why**:
- Feature should attempt transcripts by default
- Gracefully leaves field blank if captions unavailable
- Can still disable via environment variable if needed
- Aligns with philosophy: try first, fail gracefully

**Behavior**:
- **No env var set**: Transcripts enabled ✅ (new default)
- **`ENABLE_YOUTUBE_TRANSCRIPTS=true`**: Transcripts enabled ✅
- **`ENABLE_YOUTUBE_TRANSCRIPTS=false`**: Transcripts disabled ✅

**Success Check**:
- Line 61 changed from `=== 'true'` to `!== 'false'`
- Local test without env var should attempt transcript extraction

---

### Step 4: Enable Frontend Requests (2 minutes)

**File**: `src/pages/ProcessVideo.tsx`

**Location**: Line ~307

**Action**: Change `includeTranscript: false` to `includeTranscript: true`

**Why**: Frontend needs to request transcript extraction from backend

**Success Check**: Request payload includes `includeTranscript: true`

---

### Step 5: Test Locally (45 minutes)

#### Test Environment Setup

**Default (After Fix in Step 3)**:
No environment variable needed - transcripts enabled by default after Step 3 changes.

**Optional - Explicitly Enable/Disable for Testing**:
```bash
# Test with feature explicitly enabled
export ENABLE_YOUTUBE_TRANSCRIPTS=true

# Test with feature disabled (verify graceful handling)
export ENABLE_YOUTUBE_TRANSCRIPTS=false

# Start Edge Function
npx supabase functions serve short-form
```

#### Backend Test with Database Validation

1. **Start Edge Function**: `npx supabase functions serve short-form`

2. **Send test request** with YouTube Short URL (use test video: `xD1lRkvRBfw`)

3. **Watch console logs** for:
   - "Extracting YouTube transcript" (start)
   - "Successfully extracted transcript" with length/count

4. **Wait for job completion**

5. **Verify database persistence** (Run in Supabase SQL editor):
   ```sql
   -- Check processing_jobs table
   SELECT
     id,
     status,
     LENGTH(transcript) as transcript_chars,
     transcript IS NOT NULL as has_transcript,
     include_transcript,
     warnings
   FROM processing_jobs
   WHERE normalized_url LIKE '%xD1lRkvRBfw%'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Results**:
   - `status` = 'completed'
   - `transcript_chars` ≈ 927 (for this test video)
   - `has_transcript` = true
   - `include_transcript` = true
   - `warnings` = [] (empty array)

6. **Verify resource creation**:
   ```sql
   -- Check resources table
   SELECT
     id,
     title,
     type,
     LENGTH(transcript) as transcript_chars,
     SUBSTRING(transcript, 1, 100) as transcript_preview
   FROM resources
   WHERE type = 'short-video'
     AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected Results**:
   - `type` = 'short-video'
   - `transcript_chars` ≈ 927
   - `transcript_preview` starts with actual video content

7. **Check response payload** includes `transcript` field with text

#### Frontend Test

1. Start dev server: `npm run dev`
2. Navigate to `/resources/process`
3. Paste YouTube Short URL with captions (use `xD1lRkvRBfw`)
4. Watch processing status updates
5. Navigate to resource detail page
6. Verify transcript displays

**Expected Behavior**:
- Processing shows transcript status (~80% progress)
- Resource created with transcript in database
- ResourceDetail page displays transcript text

#### Test Videos to Use

**From TEST_RESULTS.md**:
- **With English Captions**: `xD1lRkvRBfw` (173 words, educational)
- **With English Captions**: `L_jWHffIx5E` (628 words, comedy)
- **Without Captions**: `NpEaa2P7qZI` (should gracefully skip)

Both scenarios should process successfully (transcript optional).

#### Success Criteria

- [ ] Video with captions extracts transcript (~173-927 chars)
- [ ] Video without captions completes normally (no errors, no transcript)
- [ ] Database `processing_jobs.transcript` populated correctly
- [ ] Database `resources.transcript` matches processing job
- [ ] Transcript displays in ResourceDetail page
- [ ] Processing completes in <20 seconds
- [ ] Logs show accurate messages (not "not implemented")

---

### Step 6: Build & Deploy (20 minutes)

#### Pre-Deployment Checks
```bash
npm run lint    # Should pass with 0 errors
npm run build   # Should complete successfully
```

**If errors**: Fix before deploying

#### Deploy Backend
```bash
npx supabase functions deploy short-form
```

**Watch for**: "Deployed successfully" message

#### Deploy Frontend
```bash
git add .
git commit -m "feat: add YouTube transcript extraction"
git push origin main
```

**Vercel auto-deploys** on push to main (~2-5 minutes)

#### Verify Deployment
1. Process one YouTube Short in production
2. Check Supabase logs for transcript extraction
3. Verify resource created with transcript
4. Check ResourceDetail page displays correctly

**Success Criteria**:
- [ ] Edge Function deploys without errors
- [ ] Frontend deploys to production
- [ ] Test video processes successfully
- [ ] Transcript appears in database and UI

---

## Rollback Plan

**If something breaks**:

### Backend Issue - Disable Transcript Extraction

**Option 1 - Environment Variable (Fastest)**:
```bash
# Set in Supabase dashboard: Environment Variables
ENABLE_YOUTUBE_TRANSCRIPTS=false

# Or via CLI
npx supabase secrets set ENABLE_YOUTUBE_TRANSCRIPTS=false
```
**Recovery time**: Instant (no code deploy needed)

**Option 2 - Code Revert**:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy Edge Function
npx supabase functions deploy short-form
```
**Recovery time**: 5-10 minutes

### Frontend Issue
```bash
# Revert commit
git revert HEAD
git push origin main
```

**Recovery time**: 5 minutes (Vercel auto-deploys)

**Note**: With environment-based configuration, you can toggle the feature without code changes or redeployment.

---

## What We're NOT Doing (Intentionally)

These are nice-to-haves but not required for feature to work:

- ❌ Enhanced UI for transcript display (already works, basic display sufficient)
- ❌ Copy-to-clipboard button (can add later as polish)
- ❌ Transcript indicator icons on cards (visual polish)
- ❌ Extensive cross-browser testing (core feature works in modern browsers)
- ❌ Performance benchmarking (transcripts add ~2-5 seconds, acceptable)
- ❌ Multi-language active selection (English + auto-fallback is sufficient)
- ❌ Unit tests with fixtures (manual testing sufficient for v1)
- ❌ 24-hour monitoring schedule (normal monitoring sufficient)

**Why skip these**: Feature works without them. Can add as polish in future iteration.

---

## Success Definition

Feature is complete when:
1. ✅ YouTube Shorts with captions get transcripts automatically
2. ✅ Videos without captions process normally (no errors)
3. ✅ Transcripts display in ResourceDetail page
4. ✅ Deployed to production without issues

**That's it**. Everything else is polish.

---

## Troubleshooting

### "Import not found" error
**Cause**: Deno can't resolve `youtube-caption-extractor`

**Fix**: Verify `deno.json` has correct import map, restart dev server

### "No captions available" for every video
**Cause**: Library may be blocked or API changed

**Fix**: Test with known video (recent Mr. Beast Short), check library GitHub issues

### Transcripts not showing in UI
**Cause**: Frontend not requesting transcripts or display component issue

**Fix**: Check `includeTranscript: true` set, verify browser console for errors

### Processing takes >30 seconds
**Cause**: Network slow or transcript very long

**Fix**: Acceptable for now, can optimize later if becomes pattern

---

## Files Changed Summary

| File | Change | Lines | Details |
|------|--------|-------|---------|
| `supabase/functions/short-form/deno.json` | Add import | +1 | Import `youtube-caption-extractor` |
| `supabase/functions/short-form/extractors/youtube.ts` | Implement extraction | ~40 | Replace stub, add fallback logic, update warnings |
| `supabase/functions/short-form/index.ts` | Change default | 1 | `=== 'true'` → `!== 'false'` |
| `src/pages/ProcessVideo.tsx` | Enable request | 1 | `false` → `true` |
| **TOTAL** | **Core changes** | **~43 lines** | |

**Key Changes**:
- ✅ Language fallback: English → auto-selected → none
- ✅ Environment default: ON (not OFF)
- ✅ Warning messages: Updated to be accurate
- ✅ Database validation: Added to testing

**Database**: No schema changes (fields already exist)

**UI**: No component changes (display already exists)

**Dependencies**: +1 (`youtube-caption-extractor`)

---

*Document Version: 3.0 (Minimal + Code Review Fixes)*
*Created: 2025-01-04*
*Updated: 2025-01-04 (addressed code review critique)*
*Estimated Implementation: 2-3 hours*

---

## Summary of Implementation

**What you're implementing**:
- ~40 line extraction function with English + fallback logic
- 1 character change to default environment config (`=== 'true'` → `!== 'false'`)
- 1 boolean change to enable frontend requests
- Warning message updates

**Total code changes**: ~43 lines across 4 files

**Philosophy**: Attempt transcripts by default, gracefully leave field blank if unavailable. No errors, no blocking, just try and fail softly.
