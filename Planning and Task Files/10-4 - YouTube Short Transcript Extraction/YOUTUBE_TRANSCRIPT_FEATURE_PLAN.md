# YouTube Transcript Extraction & Storage — Feature Plan

## Overview & Purpose

### What This Feature Adds
Automatic extraction and storage of video transcripts (captions/subtitles) for YouTube Shorts processed through the application, enabling full-text search, AI processing, and enhanced note-taking capabilities for video content.

### Why We're Adding This
**Current Gap**: The application successfully extracts metadata (title, creator, views, hashtags) from YouTube Shorts but cannot capture the actual spoken content. Users must manually transcribe or take notes on video content, losing the valuable information contained in captions.

**Value Proposition**:
- **Searchability**: Find videos by spoken content, not just metadata
- **Content Extraction**: Access quotes, key points, and insights from videos without rewatching
- **AI Processing**: Enable future features like summarization, topic extraction, and relationship mapping
- **Accessibility**: Make video content accessible to users who prefer reading over watching
- **Knowledge Capture**: Transform ephemeral short-form content into permanent, searchable knowledge

### Guiding Principles
- **Graceful Degradation**: Transcript extraction is optional; failures don't block video processing
- **User Transparency**: Clear indication when transcripts are available vs. unavailable
- **Performance**: Transcript extraction adds minimal latency to existing processing flow
- **Reliability**: Use proven libraries optimized for edge/serverless environments
- **Zero Configuration**: Works automatically for videos with available captions

---

## Feature Scope

### In Scope ✅
1. **Automatic Extraction**: Fetch transcripts during YouTube Shorts processing
2. **Multi-Language Support**: Extract transcripts in available languages (English prioritized)
3. **Auto-Generated & Manual Captions**: Support both caption types
4. **Database Storage**: Persist transcripts in `processing_jobs` and `resources` tables
5. **Frontend Display**: Show transcripts in resource detail view with formatting
6. **Graceful Failures**: Handle missing captions without breaking workflow
7. **Status Tracking**: Track transcript extraction progress in job processing

### Out of Scope ❌
1. **Audio Transcription**: No speech-to-text for videos without captions (future phase)
2. **Transcript Editing**: No user editing of extracted transcripts (display-only)
3. **Translation**: No automatic translation of non-English transcripts
4. **Timestamp Preservation**: No time-code mapping for video segments
5. **TikTok/Instagram Transcripts**: YouTube-only in this phase
6. **Transcript Search**: Full-text search capability (future enhancement)

---

## User Experience

### User Journey: Processing a YouTube Short

#### Before This Feature
1. User pastes YouTube Shorts URL into `/resources/process`
2. System extracts metadata (title, creator, views, duration, hashtags)
3. User sees resource created with metadata only
4. User manually watches video and takes notes in the Notes field

#### After This Feature
1. User pastes YouTube Shorts URL into `/resources/process`
2. System extracts metadata **and transcript** automatically
3. Processing UI shows additional status: "Extracting transcript..." (progress: 80%)
4. User sees resource created with:
   - All existing metadata fields
   - **New: Full transcript text** in dedicated Transcript section
   - Visual indicator if transcript unavailable (e.g., "Captions disabled for this video")
5. User can read full transcript, copy quotes, and reference content without rewatching

### UI Changes

#### Processing Page (`/resources/process`)
**Current Flow**:
```
[Platform Badge: YouTube Shorts]
Status: Extracting metadata... (40%)
[Progress Bar ████░░░░░░]
```

**Enhanced Flow**:
```
[Platform Badge: YouTube Shorts]
Status: Extracting metadata... (40%)
[Progress Bar ████░░░░░░]

↓ (When metadata complete)

Status: Extracting transcript... (80%)
[Progress Bar ████████░░]
Note: Attempting to fetch video captions
```

**Status Messages**:
- "Extracting transcript..." (in progress)
- "Transcript extracted successfully" (success)
- "No captions available for this video" (graceful failure)
- "Transcript extraction encountered an error" (technical failure)

#### Resource Detail Page (`/resource/:id`)

**Current Layout**:
```
[Resource Header]
[Metadata Section]
[Tags Section]
[Notes Section] ← User manually types video content here
```

**Enhanced Layout**:
```
[Resource Header]
[Metadata Section]
[Tags Section]
[Transcript Section] ← NEW: Auto-populated from captions
  - Read-only display
  - Expandable/collapsible
  - Copy-to-clipboard button
  - Language indicator (e.g., "English (auto-generated)")
  - Character count / word count
[Notes Section] ← User adds personal insights/analysis
```

**Transcript Section Variations**:
- **With Transcript**: Full text displayed with formatting, scroll if long
- **No Transcript**: Gray box with message: "No transcript available. Captions may be disabled or unavailable for this video."
- **Extraction Failed**: Warning icon + "Transcript extraction failed. You can add notes manually below."

#### Resource Cards (`/resources` list view)

**Visual Indicator**: Small icon next to short-video resources showing transcript status:
- 📝 icon: Transcript available
- No icon: No transcript

---

## Technical Architecture

### Data Flow

```
User submits YouTube URL
        ↓
Edge Function: process.ts
        ↓
Metadata extraction (existing)
        ↓
Transcript extraction (NEW)
        ├─ Extract video ID
        ├─ Call youtube-caption-extractor library
        ├─ Fetch captions (English preferred)
        ├─ Concatenate subtitle segments
        └─ Return transcript string or undefined
        ↓
Store in processing_jobs.transcript (NEW field usage)
        ↓
Frontend polls for completion
        ↓
Create resource with transcript
        ↓
Store in resources.transcript (existing field, now populated)
        ↓
Display in ResourceDetail page
```

### System Components Affected

#### Backend (Supabase Edge Functions)
**Files Modified**:
1. `supabase/functions/short-form/extractors/youtube.ts`
   - Replace stub `extractYouTubeTranscript()` function
   - Add library import and extraction logic
   - Handle errors gracefully

2. `supabase/functions/short-form/handlers/process.ts`
   - Already has transcript flow; verify correct status updates
   - Ensure warnings logged when transcript unavailable

3. `supabase/functions/short-form/deno.json` (or import map)
   - Add `youtube-caption-extractor` dependency

**Database Schema**: No changes required
- `processing_jobs.transcript` (TEXT, nullable) - Already exists ✅
- `processing_jobs.include_transcript` (BOOLEAN) - Already exists ✅
- `resources.transcript` (TEXT, nullable) - Already exists ✅

#### Frontend (React Application)
**Files Modified**:
1. `src/pages/ProcessVideo.tsx`
   - Change `includeTranscript: false` → `includeTranscript: true`
   - Update status message display for transcript phase

2. `src/pages/ResourceDetail.tsx`
   - Already has transcript editing UI ✅
   - Add read-only display mode for auto-extracted transcripts
   - Add visual distinction between manual notes and auto-extracted transcripts
   - Add copy-to-clipboard button

3. `src/components/resources/ResourceCard.tsx`
   - Add transcript availability indicator icon

4. `src/pages/Resources.tsx` (optional)
   - Add filter option: "Has Transcript" checkbox

**Storage Layer**: No changes required
- `src/data/supabaseStorage.ts` already handles transcript field ✅

### Library Selection: youtube-caption-extractor

**Why This Library**:
- ✅ **Edge Runtime Optimized**: Zero Node.js dependencies, explicit Cloudflare/Vercel/Supabase Edge support
- ✅ **Recently Maintained**: Version 1.8.2 published 20 days ago (as of 2025-01-04)
- ✅ **Production-Ready**: Built-in bot detection bypass, dual API fallbacks
- ✅ **TypeScript Native**: Ships with type definitions
- ✅ **Lightweight**: Minimal bundle impact
- ✅ **Proven Approach**: Same underlying methodology as Python's `youtube_transcript_api` (gold standard)

**Alternative Considered**:
- `youtube-transcript` (npm): Rejected due to production blocking issues in serverless environments
- `youtubei.js`: Good option but heavier (full YouTube API client, not just transcripts)

### Configuration

**Edge Function Config** (`supabase/functions/short-form/index.ts`):
```typescript
features: {
  enableYouTubeTranscripts: true  // Set to true to enable feature
}
```

**Frontend Default**:
```typescript
// ProcessVideo.tsx
includeTranscript: true  // Always request transcripts
```

**No User Configuration Required**: Feature works automatically when enabled.

---

## User-Facing Features

### 1. Automatic Transcript Extraction
**What**: System automatically fetches captions when processing YouTube Shorts
**When**: During video processing, after metadata extraction
**User Action**: None (automatic)
**User Benefit**: No manual transcription needed

### 2. Transcript Display
**What**: Dedicated section in resource detail view showing full transcript
**When**: Viewing any short-video resource with transcript
**User Action**: Navigate to resource detail page
**User Benefit**: Read video content without watching, copy quotes, reference content

### 3. Language Detection
**What**: System displays which language the transcript is in (e.g., "English (auto-generated)")
**When**: Transcript is available
**User Action**: None (informational)
**User Benefit**: Understand transcript source and accuracy expectations

### 4. Copy to Clipboard
**What**: One-click copy of entire transcript
**When**: Viewing transcript
**User Action**: Click "Copy" button
**User Benefit**: Easy content extraction for notes or other tools

### 5. Graceful Failure Handling
**What**: Clear messaging when transcripts unavailable
**When**: Video has captions disabled or extraction fails
**User Action**: None (informational)
**User Benefit**: Understand why transcript missing, no confusion

### 6. Transcript Search (Future Enhancement)
**What**: Search resources by transcript content
**When**: Not in this phase (future)
**User Action**: N/A
**User Benefit**: Find videos by spoken content

---

## Success Criteria

### Functional Requirements
- [ ] Transcripts extracted for YouTube Shorts with available captions
- [ ] Transcripts stored in database `resources.transcript` field
- [ ] Transcripts displayed in ResourceDetail page
- [ ] Processing UI shows transcript extraction progress
- [ ] Graceful handling when captions unavailable
- [ ] English captions prioritized, falls back to other languages
- [ ] No impact on videos without captions (processing completes normally)

### Performance Requirements
- [ ] Transcript extraction adds <3 seconds to total processing time
- [ ] Edge function completes within timeout limits (current: 5 minutes max)
- [ ] No performance degradation for existing metadata extraction

### User Experience Requirements
- [ ] Clear visual distinction between "no transcript" and "extraction failed"
- [ ] Transcript text formatted for readability (proper spacing, no timestamps)
- [ ] Mobile-friendly display (scrollable, responsive)
- [ ] Copy-to-clipboard functionality works across browsers

### Reliability Requirements
- [ ] 95%+ success rate for videos with public captions
- [ ] Zero crashes or blocking errors when captions unavailable
- [ ] Proper error logging for debugging failures

---

## Testing Strategy

### Unit Testing
**Component**: `extractYouTubeTranscript()` function
**Test Cases**:
- Video with manual captions (English)
- Video with auto-generated captions (English)
- Video with non-English captions
- Video with captions disabled
- Video not found / invalid ID
- Network timeout / API failure

**Expected Outcomes**:
- Returns transcript string for successful extraction
- Returns `undefined` for failures (no exceptions thrown)
- Logs appropriate warnings/errors

### Integration Testing
**Scenario**: End-to-end YouTube Shorts processing
**Test Cases**:
1. Process YouTube Short with captions → Verify transcript in database
2. Process YouTube Short without captions → Verify graceful handling
3. Process multiple videos concurrently → Verify no race conditions
4. Force refresh existing video → Verify transcript re-extracted

**Expected Outcomes**:
- `processing_jobs.transcript` populated correctly
- `resources.transcript` populated after resource creation
- Processing completes successfully in all cases

### User Acceptance Testing
**Scenario**: Manual QA checklist
1. **Happy Path**: Process known YouTube Short with captions (e.g., Mr. Beast video)
   - ✅ Transcript appears in resource detail
   - ✅ Copy button works
   - ✅ Language indicator shown

2. **No Captions**: Process video with captions disabled
   - ✅ Processing completes without errors
   - ✅ Clear "No captions available" message shown

3. **UI Responsiveness**: View transcript on mobile device
   - ✅ Text wraps properly
   - ✅ Scrolling works smoothly

4. **Existing Resources**: View previously created short-video (without transcript)
   - ✅ No errors displayed
   - ✅ Shows "No transcript" message

### Edge Cases
- Video with very long transcript (>10,000 characters)
- Video with multiple language options
- Video with only auto-generated captions
- Rate limiting / quota exceeded (library should handle)
- YouTube API changes breaking extraction (monitor logs)

---

## Risks & Mitigations

### Risk 1: YouTube API Changes
**Impact**: Transcript extraction could break if YouTube changes internal APIs
**Likelihood**: Medium (unofficial API)
**Mitigation**:
- Use actively maintained library (`youtube-caption-extractor`) with quick updates
- Monitor GitHub issues for the library
- Graceful degradation ensures core functionality unaffected
- Log extraction failures for early detection

### Risk 2: Rate Limiting / Blocking
**Impact**: Extraction fails for some users or IPs
**Likelihood**: Low (library has bot detection bypass)
**Mitigation**:
- Library already includes bypass mechanisms
- If needed, implement exponential backoff or request delays
- Monitor error logs for patterns
- Transcript is optional, so degraded UX acceptable

### Risk 3: Poor Transcript Quality
**Impact**: Users disappointed by auto-generated caption errors
**Likelihood**: Medium (auto-generated captions imperfect)
**Mitigation**:
- Display language indicator: "English (auto-generated)"
- Set user expectations: "Transcripts may contain errors from automatic captioning"
- Provide Notes field for user corrections/improvements

### Risk 4: Storage Costs
**Impact**: Large transcripts increase database storage
**Likelihood**: Low (short-form videos = short transcripts)
**Mitigation**:
- YouTube Shorts limited to 60 seconds = ~150-300 words typical
- TEXT field in Postgres handles this efficiently
- Monitor storage growth, implement cleanup if needed

### Risk 5: Feature Adoption
**Impact**: Users don't discover or use transcripts
**Likelihood**: Medium (new feature, no user education)
**Mitigation**:
- Clear visual indicators (transcript icon on cards)
- Highlight feature in UI (expandable section, good formatting)
- Consider release notes / changelog entry

---

## Rollout Plan

### Phase 1: Implementation & Testing (This Phase)
**Duration**: 1-2 days
**Activities**:
- Implement transcript extraction in Edge Function
- Update frontend display components
- Deploy to staging environment
- Execute testing checklist
- Monitor logs for errors

**Deliverables**:
- [ ] Edge Function updated with transcript extraction
- [ ] Frontend updated with transcript display
- [ ] Deployment successful
- [ ] Testing checklist completed
- [ ] No critical bugs identified

### Phase 2: Production Deployment
**Duration**: 1 day
**Activities**:
- Deploy Edge Function to production
- Deploy frontend to production (auto-deploy via Vercel)
- Monitor for 24 hours
- Verify transcripts appearing for new videos

**Success Metrics**:
- No deployment errors
- Transcript extraction success rate >90%
- No user-reported issues
- Processing time increase <3 seconds

### Phase 3: Monitoring & Iteration
**Duration**: Ongoing
**Activities**:
- Monitor extraction success/failure rates
- Collect user feedback
- Track usage metrics (how many resources have transcripts)
- Identify enhancement opportunities

**Potential Enhancements**:
- Full-text search across transcripts
- AI summarization of transcript content
- Topic extraction and auto-tagging
- Timestamp preservation for video navigation
- TikTok/Instagram transcript extraction

---

## Rollback Strategy

### If Transcript Extraction Breaks Processing
**Symptoms**: Videos fail to process, jobs stuck in "transcript" status
**Action**:
1. Set `enableYouTubeTranscripts: false` in Edge Function config
2. Redeploy Edge Function
3. Processing reverts to metadata-only (existing behavior)

**Impact**: New videos won't have transcripts, but all other functionality restored

### If UI Display Causes Issues
**Symptoms**: Resource detail page crashes, errors in console
**Action**:
1. Add conditional rendering: `{resource.transcript && <TranscriptSection />}`
2. Deploy frontend fix via Vercel
3. Auto-deploy completes in ~2 minutes

**Impact**: Transcripts hidden temporarily, no data loss

### Database Rollback
**Not Required**: Using existing `transcript` field, no schema changes made

---

## Dependencies & Prerequisites

### External Dependencies
- **Library**: `youtube-caption-extractor` (npm package)
- **Runtime**: Deno (Supabase Edge Functions)
- **YouTube**: Public videos with available captions

### Internal Dependencies
- ✅ Existing YouTube metadata extraction infrastructure
- ✅ Processing jobs table and workflow
- ✅ Resource schema with transcript field
- ✅ Hybrid storage adapter

### Prerequisites for Deployment
- [ ] `youtube-caption-extractor` added to Deno import map
- [ ] Edge Function tested locally with real YouTube URLs
- [ ] Frontend changes tested with mock transcript data
- [ ] Supabase secrets configured (no new secrets required)
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

---

## Metrics & Monitoring

### Success Metrics (Post-Launch)
**Extraction Success Rate**:
- Target: >95% for videos with public captions
- Measurement: `COUNT(transcript IS NOT NULL) / COUNT(*)` for short-video resources
- Alert: If success rate drops below 80%

**Processing Performance**:
- Target: <3 seconds added for transcript extraction
- Measurement: Compare average processing time before/after feature
- Alert: If average time increases >5 seconds

**User Engagement**:
- Measurement: Percentage of resource detail views that expand transcript section
- Target: >30% of users interact with transcripts
- Instrumentation: (Future) Add analytics event for transcript interactions

### Monitoring & Alerts
**Error Logging**:
- Log all transcript extraction failures with video ID and error message
- Monitor Supabase Edge Function logs for patterns
- Set up alert if error rate >10% over 1 hour

**Resource Transcript Coverage**:
- Weekly report: % of short-video resources with transcripts
- Track trending up/down over time
- Investigate drops (could indicate YouTube API changes)

---

## Future Enhancements (Out of Scope for This Phase)

### Priority 1: Full-Text Search
**Description**: Search all resources by transcript content, not just metadata
**Value**: Find videos by spoken phrases, quotes, topics
**Effort**: Medium (requires search index implementation)

### Priority 2: AI Summarization
**Description**: Auto-generate summary of transcript content
**Value**: Quick understanding of video content without reading full transcript
**Effort**: Medium (integrate with OpenAI/Anthropic API)

### Priority 3: Topic Extraction & Auto-Tagging
**Description**: Extract key topics from transcript, suggest tags
**Value**: Better organization and discoverability
**Effort**: High (NLP/ML integration)

### Priority 4: Timestamp Preservation
**Description**: Keep time codes for transcript segments, link to video player
**Value**: Jump to specific moments in video
**Effort**: High (requires video player integration)

### Priority 5: TikTok/Instagram Transcripts
**Description**: Extend transcript extraction to other platforms
**Value**: Consistent experience across all short-form platforms
**Effort**: High (different APIs, caption availability varies)

### Priority 6: Transcript Editing
**Description**: Allow users to edit/correct auto-generated transcripts
**Value**: Improve accuracy, fix common caption errors
**Effort**: Medium (UI + storage for edited versions)

---

## Deliverables Checklist

### Implementation
- [ ] Edge Function transcript extraction implemented
- [ ] Frontend transcript display implemented
- [ ] Deno dependency added
- [ ] Configuration updated

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests executed successfully
- [ ] Manual QA checklist completed
- [ ] Edge cases tested and documented

### Deployment
- [ ] Edge Function deployed to production
- [ ] Frontend deployed to production
- [ ] No deployment errors
- [ ] Smoke test passed (process real video with captions)

### Documentation
- [ ] This feature plan completed
- [ ] Code comments added for transcript extraction logic
- [ ] README updated with transcript feature description
- [ ] CLAUDE.md updated if new patterns introduced

### Validation
- [ ] Transcript extracted for test video with captions
- [ ] Transcript displayed correctly in UI
- [ ] Graceful handling verified for video without captions
- [ ] Processing time acceptable (<3 seconds added)
- [ ] No errors in Supabase logs

---

## Summary

**Feature**: Automatic YouTube transcript extraction and storage for short-form videos

**Purpose**: Transform spoken video content into searchable, referenceable text within the knowledge vault

**Approach**: Leverage edge-optimized `youtube-caption-extractor` library to fetch captions during existing video processing workflow, store in database, and display in resource detail UI

**Impact**:
- **User Experience**: Enhanced value from short-form videos; content becomes permanent, searchable knowledge
- **Technical Debt**: Zero (uses existing fields, infrastructure, and workflows)
- **Performance**: Minimal (<3 seconds added to processing)
- **Reliability**: High (graceful degradation, proven library, no blocking failures)

**Estimated Effort**: 1-2 days for implementation, testing, and deployment

**Risk Level**: Low (optional feature, well-tested library, clear rollback path)

**Dependencies**: Single npm package, zero new infrastructure

**User Value**: High (unlocks searchability, content extraction, AI processing potential)

---

*Document Version: 1.0*
*Created: 2025-01-04*
*Status: Ready for Implementation*
