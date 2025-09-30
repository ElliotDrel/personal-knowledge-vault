# URL Processing Refactor - Implementation Plan & Status

## Overview & Strategy
- Approach: User-first immediate input; URL processing accessible directly from Dashboard home page with minimal navigation friction.
- Goal: Transform URL workflow from multi-page navigation to single-page input with intelligent detection and routing.
- Integration strategy: Reuse existing `useUrlDetection` hook and utilities; maintain scalable architecture that automatically supports new platforms.
- Processing architecture: Dashboard = input detection, ProcessVideo = status-only monitoring, NewResource = manual fallback.
- Parity strategy: Keep frontend and backend URL normalization/detection in sync via shared patterns or tests.

## Current Status (Updated 2025-09-30)
- Overall feature: **Planning phase - Implementation pending**
- Current pain point identified:
  - ❌ URL input requires navigation (Dashboard → Click button → Navigate to ProcessVideo page → Paste URL)
  - ❌ 3-step process creates friction for primary use case
  - ❌ ProcessVideo page duplicates responsibilities (input + status)
- Desired state:
  - ✅ URL textbox immediately visible on Dashboard home page
  - ✅ Smart auto-detection determines routing (processable vs manual)
  - ✅ ProcessVideo becomes status-only page (single responsibility)
  - ✅ Clear fallback messaging for unsupported URLs
- Architecture advantages:
  - ✅ Reuses existing detection logic (zero duplication)
  - ✅ Scalable: new platforms work automatically via PLATFORM_CONFIGS
  - ✅ Type-safe with discriminated unions
  - ✅ Clear separation of concerns
  - ✅ Front/back parity enforced (normalization and detection stay aligned)
  - ⚠️ SPA requires JavaScript (no claim of non-JS progressive enhancement)

## Phase 1: Dashboard URL Input Section (Status: Planned)
*Goal: Add immediate URL input capability to Dashboard home page.*

### Implementation Details
**File: `src/pages/Dashboard.tsx`**

**Changes Required:**
1. **Import Detection Hook** (line ~10):
   ```typescript
   import { useUrlDetection } from '@/hooks/useUrlDetection'
   import { useNavigate } from 'react-router-dom'
   import { Input } from '@/components/ui/input'
   ```

2. **Add URL State Management** (after line 59):
   ```typescript
   const navigate = useNavigate()

   const {
     url,
     setUrl,
     result: urlResult,
     isDetecting,
     shouldShowProcessButton,
     getStatusMessage,
     getStatusColor
   } = useUrlDetection('', { debounceMs: 300 })
   ```

3. **Add Navigation Handlers**:
   ```typescript
   const handleProcessVideo = () => {
     if (!urlResult?.normalizedUrl) return
     navigate(`/resources/process?url=${encodeURIComponent(urlResult.normalizedUrl)}`)
   }

   const handleManualAdd = () => {
     const params = new URLSearchParams()
     if (url && urlResult?.isValid) {
       params.set('url', url)
       params.set('type', 'video')
     }
     navigate(`/resources/new${params.toString() ? `?${params.toString()}` : ''}`)
   }
   ```

4. **Replace Quick Actions Section** (lines 188-237):
   - Add large URL textbox above "Featured: Short-Form Video Processing" section
   - Show conditional UI based on detection state:
     - **State 1 (Empty)**: Just textbox with placeholder
     - **State 2 (Processable URL)**: Show success indicator + "Process Video" button
     - **State 3 (Non-processable URL)**: Show info message + "Add Manual Resource" button
     - **State 4 (Invalid URL)**: Show error message
   - Keep "Add Manual Resource" button always visible
   - Preserve existing resource type quick-action buttons below

5. **Status Color Helper (New):** Define a small helper or inline mapping to convert `getStatusColor()` to classes. Example:
   ```typescript
   const statusColorToClass = (color: 'success' | 'warning' | 'error' | 'neutral') => (
     color === 'success' ? 'text-success' :
     color === 'error' ? 'text-destructive' :
     color === 'warning' ? 'text-amber-600' : 'text-muted-foreground'
   )
   ```

6. **Enter Key Handling (New):** When the user presses Enter in the URL input, trigger the primary action:
   ```tsx
   <Input
     id="url-input"
     type="url"
     ...
     onKeyDown={(e) => {
       if (e.key === 'Enter') {
         if (shouldShowProcessButton) handleProcessVideo()
         else if (urlResult?.isValid) handleManualAdd()
       }
     }}
   />
   ```

### UI Component Structure
```jsx
{/* URL Processing Section */}
<Card>
  <CardHeader>
    <CardTitle>Add Resource</CardTitle>
    <CardDescription>Paste a URL for automatic extraction, or add manually</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* URL Input */}
    <div className="space-y-2">
      <Label htmlFor="url-input">Resource URL</Label>
      <Input
        id="url-input"
        type="url"
        placeholder="Paste a YouTube Shorts, TikTok, or Instagram Reels URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="text-base h-12"
      />
    </div>

    {/* Detection Status */}
    {url && (
      <div className="rounded-md border p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          {urlResult?.isShortFormVideo ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : urlResult?.isValid === false ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Clock className="h-5 w-5 text-muted-foreground" />
          )}

          {/* Status Message */}
          <div className="space-y-1 text-sm flex-1">
            <p className={statusColorToClass(getStatusColor())}>
              {getStatusMessage()}
            </p>
            {urlResult?.platformInfo && (
              <Badge variant="outline" className="text-xs">
                {urlResult.platformInfo.icon} {urlResult.platformInfo.displayName}
              </Badge>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Action Buttons */}
    <div className="flex gap-3">
      {shouldShowProcessButton ? (
        <Button onClick={handleProcessVideo} className="flex-1">
          <Sparkles className="w-4 h-4 mr-2" />
          Process Video
        </Button>
      ) : null}

      <Button
        variant={shouldShowProcessButton ? "outline" : "default"}
        onClick={handleManualAdd}
        className={shouldShowProcessButton ? "" : "flex-1"}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Manual Resource
      </Button>
    </div>
  </CardContent>
</Card>
```

### Technical Rationale
- **Reuses `useUrlDetection` hook**: Zero code duplication, automatic platform support
- **Debounced detection (300ms)**: Prevents excessive validation calls while typing
- **Query param navigation**: Preserves URL state, supports browser back button, enables deep linking
- **Conditional rendering**: Clear visual feedback for all URL states (empty, valid, invalid, processable)
- **Graceful fallback**: Manual resource option always available

### Testing Checklist
- [ ] Empty state: textbox visible, placeholder shown, manual button available
- [ ] Valid processable URL: success indicator, platform badge, "Process Video" button shown
- [ ] Valid non-processable URL: info message, "Add Manual Resource" button emphasized
- [ ] Invalid URL: error message shown, user can manually clear
- [ ] Navigation: "Process Video" navigates to `/resources/process?url=...`
- [ ] Navigation: "Add Manual Resource" navigates to `/resources/new?url=...&type=video`
- [ ] Debouncing: typing doesn't trigger excessive detection calls

## Phase 2: Transform ProcessVideo to Status-Only Page (Status: Planned)
*Goal: Remove URL input from ProcessVideo page; focus solely on job status monitoring.*

### Implementation Details
**File: `src/pages/ProcessVideo.tsx`**

**Changes Required:**
1. **Remove URL Input Card** (lines 538-624):
   - Delete entire "Video URL" CardComponent
   - URL now comes exclusively from query params (already implemented at line 129)

2. **Update Page Header** (lines 527-536):
   ```jsx
   <div className="text-center space-y-2">
     <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
       <Sparkles className="h-8 w-8 text-primary" />
       Processing Video
     </h1>
     <p className="text-muted-foreground max-w-2xl mx-auto">
       Monitoring your video processing job. You can safely navigate away and return later.
     </p>
   </div>
   ```

3. **Add Back Navigation** (line ~514):
   ```jsx
   <Button
     variant="ghost"
     size="sm"
     onClick={() => navigate('/')}
     className="flex items-center gap-2"
   >
     <ArrowLeft className="h-4 w-4" />
     Back to Dashboard
   </Button>
   ```

4. **Add Auto-Processing Effect (Gated)** (after existing useEffects, ~line 481):
   ```typescript
   // Auto-start processing when page loads with valid URL
   useEffect(() => {
     if (existingJobChecked && shouldShowProcessButton && !jobId && !processMutation.isPending && !isPolling) {
       console.log('🚀 [Auto-Process] Starting automatic processing')
       processMutation.mutate(url)
     }
   }, [existingJobChecked, shouldShowProcessButton, url, jobId, processMutation, isPolling])
   ```

5. **Warn on Navigation During Processing (New):** Add a `beforeunload` guard while processing, remove it on completion/failure.
   ```typescript
   useEffect(() => {
     const handler = (e: BeforeUnloadEvent) => {
       if (isProcessing) {
         e.preventDefault()
         e.returnValue = ''
       }
     }
     window.addEventListener('beforeunload', handler)
     return () => window.removeEventListener('beforeunload', handler)
   }, [isProcessing])
   ```

6. **Simplify Layout**:
   - Remove URL input section entirely
   - Keep: Processing Status card (lines 627-666)
   - Keep: Error State alert (lines 668-676)
   - Keep: Supported Platforms card (lines 678-716)
   - Page becomes read-only status monitor

### Architecture Changes
**Before (Current State):**
```
ProcessVideo Page:
├── URL Input Card (editable)
├── Processing Status Card
├── Error State Alert
└── Supported Platforms Card
```

**After (Refactored State):**
```
ProcessVideo Page (Status-Only):
├── Processing Status Card
├── Error State Alert
└── Supported Platforms Card

(URL input moved to Dashboard)
```

### Technical Rationale
- **Single Responsibility Principle**: ProcessVideo now only monitors status, doesn't handle input
- **Clear User Flow**: Dashboard → Input URL → Auto-navigate to ProcessVideo → Monitor progress
- **Auto-processing**: Seamless UX (user clicks "Process" button, immediately sees progress)
- **Deep Linking Preserved**: Can still share/bookmark processing URLs (query param support maintained)
- **No Duplicate Jobs**: Existing job recovery logic prevents race conditions (lines 176-278)

### Testing Checklist
- [ ] Direct navigation with URL: `/resources/process?url=https://youtube.com/shorts/abc` auto-starts processing
- [ ] No URL input visible on page
- [ ] Progress indicators show correctly
- [ ] Error states display properly
- [ ] "Back to Dashboard" button navigates to `/`
- [ ] Job recovery logic still works (existing job detection)
- [ ] Can't accidentally start duplicate jobs

## Phase 3: NewResource URL Pre-fill Enhancement (Status: Planned)
*Goal: Pre-populate URL field when navigated from Dashboard with unsupported URL.*

### Implementation Details
**File: `src/pages/NewResource.tsx`**

**Changes Required:**
1. **Extract URL Query Param** (line ~40):
   ```typescript
   const preSelectedType = (searchParams.get('type') as keyof ResourceTypeConfig | null) || null
   const preFilledUrl = searchParams.get('url') || null  // ← NEW
   ```

2. **Pre-fill URL in formData** (line ~54):
   ```typescript
   const [formData, setFormData] = useState({
     title: '',
     description: '',
     notes: '',
     transcript: '',
     tags: '',
     author: '',
     creator: '',
     platform: '',
     year: '',
     duration: '',
     url: preFilledUrl || '',  // ← MODIFIED
     isbn: '',
     episode: '',
     readTime: ''
   })
   ```

3. **Add Info Alert** (after line 392, before form):
   ```jsx
   {preFilledUrl && (
     <Alert className="mb-8">
       <AlertDescription>
         We couldn't automatically process this URL. Please fill in the details manually.
       </AlertDescription>
     </Alert>
   )}
   ```

### User Experience Flow
```
User pastes: https://vimeo.com/123456 on Dashboard
                    ↓
Detection result: Valid URL, but not processable
                    ↓
User clicks: "Add Manual Resource"
                    ↓
Navigate to: /resources/new?url=https://vimeo.com/123456&type=video
                    ↓
Form loads with:
  - Info alert: "We couldn't automatically process this URL..."
  - URL field pre-filled: "https://vimeo.com/123456"
  - Type pre-selected: "Video"
  - Other fields empty (user fills manually)
```

### Technical Rationale
- **Minimal Changes**: URL field already exists in form (line 269-282)
- **Clear Communication**: Info alert explains why manual entry is needed
- **Seamless Fallback**: User doesn't lose URL data, just adds metadata manually
- **Type-Safe**: Uses existing query param extraction pattern

### Testing Checklist
- [ ] Navigate with URL param: `/resources/new?url=https://vimeo.com/123`
- [ ] URL field shows pre-filled value
- [ ] Info alert visible explaining manual entry
- [ ] Type pre-selected when `type` param provided
- [ ] Form submission works normally with pre-filled URL
- [ ] Navigate without URL param: form loads empty (existing behavior)

## Phase 4: Detection Robustness & Front/Back Parity (Status: Planned)
*Goal: Ensure resilient, consistent URL detection across frontend and backend.*

### Normalize and Detect Consistently
**Fix YouTube Shorts assumption:**
- Do not assume all `youtu.be` links are Shorts on either frontend or backend. Restrict Shorts detection to explicit `/shorts/` URLs. Optionally follow `youtu.be` redirects server-side to classify accurately.

**Keep parity between frontend and backend:**
- Update both `src/utils/urlDetection.ts` and `supabase/functions/short-form/utils/urlUtils.ts` together when changing normalization/detection.
- Add parity tests for a corpus of URLs (YouTube shorts/watch/youtu.be, TikTok standard/vm, Instagram reel/p) to ensure identical outcomes.

### Scalability Test: Adding New Platform
**Scenario: Add "Facebook Reels" support**

**Required Changes:**
1. Update `src/types/shortFormApi.ts`:
   ```typescript
   export type ShortFormPlatform = 'tiktok' | 'youtube-short' | 'instagram-reel' | 'facebook-reel'

   export const PLATFORM_CONFIGS: Record<ShortFormPlatform, PlatformConfig> = {
     // ... existing configs
     'facebook-reel': {
       name: 'facebook-reel',
       displayName: 'Facebook Reels',
       supportedFeatures: { metadata: true, transcript: false, thumbnails: true },
       urlPatterns: [
         /^https?:\/\/(www\.)?facebook\.com\/reel\/[\w-]+/
       ],
       rateLimit: { requestsPerHour: 500, burstLimit: 5 }
     }
   }
   ```

2. Update `src/utils/urlDetection.ts`:
   ```typescript
   const FRONTEND_PLATFORM_CONFIGS: Record<ShortFormPlatform, PlatformInfo> = {
     // ... existing configs
     'facebook-reel': {
       name: 'facebook-reel',
       displayName: 'Facebook Reels',
       icon: '👍',
       supportedFeatures: { metadata: true, transcript: false, thumbnails: true }
     }
   }

   function normalizeFacebookUrl(parsed: URL): string {
     parsed.hostname = 'facebook.com'
     parsed.search = ''
     parsed.hash = ''
     return parsed.toString()
   }

   // Add to normalizeUrl() switch statement
   } else if (hostname === 'facebook.com') {
     return normalizeFacebookUrl(parsed)
   ```

**Zero Changes Needed:**
- ✅ Dashboard URL input (uses `detectPlatform()` dynamically)
- ✅ ProcessVideo status page (platform-agnostic polling)
- ✅ NewResource manual form (accepts any URL)
- ✅ useUrlDetection hook (reads from PLATFORM_CONFIGS)

### Architecture Validation Checklist
- [ ] Normalization/detection parity tests pass (front/back)
- [ ] New platform added to `PLATFORM_CONFIGS`
- [ ] Detection automatically works on Dashboard
- [ ] ProcessVideo can monitor new platform jobs
- [ ] No changes needed to component logic
- [ ] Type safety maintained (ShortFormPlatform union type)

## Milestones & Testing Checkpoints
- 📅 **Phase 1 (Day 1)**: Dashboard URL input section implemented and tested
- 📅 **Phase 2 (Day 1-2)**: ProcessVideo refactored to status-only, auto-processing validated
- 📅 **Phase 3 (Day 2)**: NewResource URL pre-fill implemented
- 📅 **Phase 4 (Day 2)**: Robust detection parity and E2E validation
- 📅 **Phase 5 (Day 2-3)**: Platform addition playbook validated (optional)
- 🎯 **Production Ready (Day 3)**: All phases tested, documentation updated, monitoring in place

### Testing Workflow
**Flow 1: Processable URL (YouTube Short)**
1. Navigate to Dashboard `/`
2. Paste `https://youtube.com/shorts/abc123` in textbox
3. See "✓ YouTube Shorts detected" with badge
4. Click "Process Video" button
5. Navigate to `/resources/process?url=...`
6. See processing progress (no URL input visible)
7. After completion, navigate to `/resource/:id`
8. Verify metadata populated correctly
9. Pressing Enter in the Dashboard input also triggers processing

**Flow 2: Non-processable URL (Vimeo)**
1. Navigate to Dashboard `/`
2. Paste `https://vimeo.com/123456` in textbox
3. See "Can't auto-process this - please add manually" message
4. Click "Add Manual Resource" button
5. Navigate to `/resources/new?url=...&type=video`
6. See URL pre-filled and info alert shown
7. Fill remaining fields manually
8. Submit form successfully

**Flow 3: Invalid URL**
1. Navigate to Dashboard `/`
2. Type "not a valid url" in textbox
3. See "This is not a valid URL" error message
4. User manually clears textbox
5. Error message disappears

**Flow 4: Manual Resource (No URL)**
1. Navigate to Dashboard `/`
2. Click "Add Manual Resource" (textbox empty)
3. Navigate to `/resources/new`
4. Form loads empty (normal behavior)
5. User fills all fields manually

**Flow 5: Direct ProcessVideo Navigation**
1. Navigate directly to `/resources/process?url=https://youtube.com/shorts/xyz`
2. Page auto-starts processing after existing-job check settles (no user interaction needed)
3. See progress indicators updating
4. Job completes successfully
5. Beforeunload guard active during processing; removed on completion/failure

## Key Libraries & Tools
- Frontend: React 18, Vite 7, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query
- Existing Hooks: `useUrlDetection` (URL validation), `useAuth` (authentication), `useStorageAdapter` (data persistence)
- Detection Logic: `src/utils/urlDetection.ts`, `src/types/shortFormApi.ts` (PLATFORM_CONFIGS)
- No new dependencies required

## Risks & Mitigations
- **Risk**: Users accidentally navigate away during processing
  - **Mitigation**: Add browser beforeunload warning, polling continues in background, job recovery on return
- **Risk**: URL detection false positives (e.g., non-video YouTube links)
  - **Mitigation**: Strict regex patterns in PLATFORM_CONFIGS, backend validation rejects invalid content
- **Risk**: Dashboard page becomes cluttered with URL input
  - **Mitigation**: Clean card-based design, collapsible section if needed, matches existing UI patterns
- **Risk**: Breaking existing ProcessVideo deep links
  - **Mitigation**: Query param support preserved, auto-processing maintains backward compatibility
- **Risk**: Front/back detection drift over time
  - **Mitigation**: Shared config or parity tests to enforce identical outcomes
- **Risk**: `youtu.be` links misclassified as Shorts
  - **Mitigation**: Only treat explicit `/shorts/` as Shorts; optionally resolve short URLs backend-side
- **Risk**: Duplicate job starts due to racing auto-start and job recovery
  - **Mitigation**: Gate auto-start on `existingJobChecked`

## Implementation Summary & Next Steps

### 📋 **FILES TO MODIFY**

**Primary Changes:**
1. ✏️ `src/pages/Dashboard.tsx` (~+150 lines)
   - Add URL input section with detection hooks
   - Add navigation handlers
   - Replace Quick Actions section UI

2. ✏️ `src/pages/ProcessVideo.tsx` (~-100 lines, ~+40 lines)
   - Remove URL input card
   - Update page header
   - Add gated auto-processing effect
   - Add beforeunload guard during processing
   - Simplify to status-only layout

3. ✏️ `src/pages/NewResource.tsx` (~+15 lines)
   - Extract URL query param
   - Pre-fill URL in formData
   - Add info alert for unsupported URLs

**Normalization/Parity Changes:**
- ✏️ `src/utils/urlDetection.ts` (~±20 lines): Correct `youtu.be` Shorts assumption; align normalization/detection with backend
- ✏️ `supabase/functions/short-form/utils/urlUtils.ts` (~±20 lines): Correct `youtu.be` Shorts assumption; keep parity with frontend
- ✅ `src/hooks/useUrlDetection.ts` (no change)
- ✅ `src/types/shortFormApi.ts` (no change for refactor; changes only when adding platforms)
- ✅ `src/App.tsx` (routes already configured)

### 🎯 **TECHNICAL ACHIEVEMENTS EXPECTED**

**Architecture Wins:**
- ✅ **Zero Duplication**: Reuses existing `useUrlDetection` hook throughout
- ✅ **Scalable Design**: New platforms work automatically via PLATFORM_CONFIGS
- ✅ **Type Safety**: Leverages TypeScript discriminated unions and strict types
- ✅ **Clear Separation**: Dashboard=input, ProcessVideo=status, NewResource=manual
- ⚠️ **SPA Reality**: Flow requires JavaScript; ensure robust JS-based UX

**User Experience Wins:**
- ✅ **Immediate Input**: No navigation needed to paste URLs
- ✅ **Smart Routing**: System determines processable vs manual automatically
- ✅ **Clear Feedback**: Visual indicators for all URL states
- ✅ **Graceful Fallback**: Manual option always available

**Code Quality Wins:**
- ✅ **Single Responsibility**: Each page has one clear purpose
- ✅ **DRY Principle**: Detection logic centralized, not duplicated
- ✅ **Testable**: Clear state transitions, deterministic behavior
- ✅ **Maintainable**: Adding platforms requires only config changes

### 🚀 **IMPLEMENTATION STRATEGY**

**Phase 1 (2-3 hours):**
- Implement Dashboard URL input section
- Test all URL detection states (empty, valid, invalid, processable)
- Verify navigation to ProcessVideo and NewResource

**Phase 2 (1 hour):**
- Refactor ProcessVideo to status-only
- Implement auto-processing effect
- Test direct navigation and auto-start behavior

**Phase 3 (30 minutes):**
- Add URL pre-fill to NewResource
- Test manual fallback flow
- Verify info alert displays correctly

**Phase 4 (30 minutes):**
- End-to-end testing all flows
- Verify scalability with mock new platform
- Update documentation and CLAUDE.md

**Total Estimated Time: 4-5 hours**

### 🎨 **UI/UX DESIGN PRINCIPLES**

**Visual Hierarchy:**
1. **Primary Action**: Big URL textbox (hero element, draws eye first)
2. **Smart Buttons**: Conditional based on detection (Process vs Manual)
3. **Secondary Actions**: Manual resource button always visible below
4. **Tertiary Actions**: Existing resource type quick-actions preserved

**Feedback States:**
- **Empty**: Minimal UI, placeholder text guides user
- **Detecting**: Subtle loading indicator (debounced, brief)
- **Success**: Green checkmark, platform badge, prominent "Process" button
- **Warning**: Amber icon, helpful message, "Add Manual Resource" emphasized
- **Error**: Red X icon, clear error text, user can manually clear

**Accessibility:**
- Proper ARIA labels on URL input
- Keyboard navigation supported
- Screen reader announcements for status changes
- Focus management on navigation

### 📊 **SUCCESS METRICS**

**User Behavior:**
- Time from Dashboard load to URL processing start (target: <10 seconds)
- Percentage of users finding URL input without help text (target: >90%)
- Manual fallback usage rate for supported platforms (target: <5%)

**Technical Metrics:**
- Zero increase in detection logic duplication (0 new `detectPlatform` calls)
- Bundle size change (target: <5KB increase)
- Performance impact on Dashboard load (target: <50ms)
- Parity tests green for all URL samples

**Quality Metrics:**
- Test coverage maintained (target: >80%)
- Zero new TypeScript errors introduced
- Zero accessibility regressions (WCAG AA maintained)

### 🔄 **ROLLBACK PLAN**

**If Issues Arise:**
1. **Phase 1 Only Failed**: Revert Dashboard changes, existing flows still work (no breaking changes)
2. **Phase 2 Rollback**: Restore ProcessVideo URL input, update navigation links back
3. **Phase 3 Optional**: URL pre-fill is enhancement only (not critical path)

**Git Strategy:**
- Commit each phase separately with clear messages
- Tag release before starting refactor
- Feature branch: `refactor/url-processing-workflow`
- PR review before merging to main

**Monitoring:**
- Watch error rates on ProcessVideo page (detect auto-processing failures)
- Monitor navigation paths (verify users finding new URL input)
- Check support tickets (identify confusion or missing features)

### 📚 **DOCUMENTATION UPDATES REQUIRED**

**Update `CLAUDE.md`:**
```markdown
### URL Processing Workflow

**User Flow**:
1. Navigate to Dashboard home page (`/`)
2. Paste URL in textbox (YouTube Shorts, TikTok, Instagram Reels)
3. System auto-detects platform and shows options:
   - **Processable**: "Process Video" button → auto-extraction
   - **Non-processable**: "Add Manual Resource" button → manual form

**Architecture**:
- `Dashboard.tsx`: URL input and detection (uses `useUrlDetection` hook)
- `ProcessVideo.tsx`: Status-only monitoring page (no input, auto-starts processing)
- `NewResource.tsx`: Manual fallback with URL pre-fill support
- Parity: Frontend and backend share normalization/detection patterns; parity tests ensure alignment

**Adding New Platforms**:
1. Update `PLATFORM_CONFIGS` in `src/types/shortFormApi.ts`
2. Add normalization logic in `src/utils/urlDetection.ts` and backend `urlUtils.ts`
3. Implement backend extractor/handlers
4. Dashboard and ProcessVideo automatically support new platform ✨
```

**Update User-Facing Help Text:**
- Add help section explaining supported platforms
- Document manual fallback for unsupported URLs
- Include screenshots of URL input on Dashboard

**Update Developer Documentation:**
- Architecture diagram showing new flow
- Component responsibilities (input vs status vs manual)
- Testing procedures for URL detection changes
- Parity testing approach and shared config locations

## Additional Notes
- ✅ **Backward Compatibility**: Existing ProcessVideo deep links continue to work (query param support maintained)
- ✅ **Mobile Responsive**: URL input designed for mobile paste workflows
- ✅ **Performance**: Debounced detection prevents excessive API calls
- ✅ **Security**: All URL validation happens client-side before navigation, backend still validates
- 🎯 **Future Enhancement**: Could add recent URLs dropdown (requires localStorage/Supabase persistence)
- 🎯 **Future Enhancement**: Browser extension integration (one-click from any page)