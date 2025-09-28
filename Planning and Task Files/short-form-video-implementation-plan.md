# Short-Form Video Auto-Extraction: Detailed Implementation Plan

## 1. What We Are Building

Create an auto-extraction workflow that lets a user paste a short-form video URL (TikTok, YouTube Shorts, Instagram Reels) and land on a pre-filled resource form that they can review, annotate, and save.

## 2. Guiding Principles
- Keep the existing resource type pipeline intact; short-form videos remain a `video` resource so Supabase schema stays valid.
- Reuse current dynamic forms and storage utilities; layer short-form behaviour through configuration and metadata instead of parallel code paths.
- Prioritise reliability over theatrics: only promise UX affordances we can deliver (deterministic progress states, cancellable requests).
- Keep extraction work on serverless routes so large libraries stay off the client and CORS is avoided.

---

## 3. Phase Breakdown

### Phase 1 - Data Model and Configuration Updates

#### 1.1 Extend `Resource` typings without changing the core enum
**File:** `src/data/mockData.ts`
```typescript
export interface Resource {
  id: string;
  type: 'book' | 'video' | 'podcast' | 'article';
  // existing fields...
  shortFormPlatform?: 'tiktok' | 'youtube-short' | 'instagram-reel';
  shortFormMetadata?: {
    handle?: string;
    channelName?: string;
    hashtags?: string[];
    viewCount?: number;
    extractedAt?: string;
    extractionMethod?: 'auto' | 'manual';
  };
}
```

*Why:* We keep `type` aligned with Supabase (`'video'`) while still exposing structured metadata. Every new field is optional so legacy resources continue to type-check.

#### 1.2 Persist short-form metadata in both storage adapters
**Files:** `src/data/storage.ts`, `src/data/supabaseStorage.ts`
- Ensure `shortFormPlatform` and `shortFormMetadata` survive the round-trip by including them in `transformToDatabase` and by merging them back when reading from Supabase or localStorage.
- When saving to Supabase, store `shortFormMetadata` inside the existing `metadata` JSON column.

#### 1.3 Extend resource type configuration for contextual fields
**File:** `src/data/mockData.ts`
```typescript
export const resourceTypeConfig = {
  // existing resource configs...
  video: {
    label: 'Videos',
    icon: 'video-short',
    color: 'knowledge-video',
    fields: ['creator', 'platform', 'duration', 'url'],
    optionalShortFormFields: ['shortFormPlatform', 'handle', 'channelName', 'hashtags', 'viewCount']
  }
} as const;
```
Add a helper
```typescript
export const shortFormFieldMap: Record<string, string[]> = {
  'youtube-short': ['channelName', 'hashtags', 'viewCount'],
  tiktok: ['handle', 'hashtags'],
  'instagram-reel': ['handle', 'hashtags']
};
```
*Why:* Forms can show these optional inputs only when the extraction flow detects short-form context. Regular video creation stays unchanged.

#### 1.4 Platform styling tokens
**File:** `src/index.css`
```css
:root {
  --knowledge-tiktok: 240 5% 96%;
  --knowledge-tiktok-foreground: 240 10% 3.9%;
  --knowledge-youtube: 0 84% 60%;
  --knowledge-instagram: 315 100% 70%;
}
```
Optional but keeps branded accents available for badges or chips.

---

### Phase 2 - Serverless Extraction Architecture

#### 2.1 Dependencies (server only)
**File:** `package.json`
```json
{
  "dependencies": {
    "youtubei.js": "^6.4.0",
    "youtube-transcript": "^1.0.6",
    "open-graph-scraper": "^6.5.2"
  }
}
```
*Why these libraries*
- `youtubei.js`: lightweight metadata access for Shorts without the heavy `ytdl-core` bundle.
- `youtube-transcript`: transcript fallback (we tolerate failures).
- `open-graph-scraper`: best-effort Instagram and TikTok Open Graph parsing when no public API exists.

#### 2.2 Platform detection utility
**File:** `src/utils/videoUrlDetection.ts`
```typescript
export type VideoPlatform = 'youtube' | 'tiktok' | 'instagram';

export interface PlatformDetectionResult {
  platform: VideoPlatform | null;
  variant?: 'shorts';
  isValid: boolean;
  error?: string;
  videoId?: string;
}
```
- Normalise YouTube Shorts to `platform: 'youtube', variant: 'shorts'` so the API route path is `/api/scrape/youtube`.
- TikTok and Instagram return `platform: 'tiktok'` or `platform: 'instagram'` along with the resolved video ID when available.

#### 2.3 API routes
Create or adjust the following Vercel functions:
- `api/scrape/detect.ts`: POST `{ url }` -> `PlatformDetectionResult`.
- `api/scrape/youtube.ts`: Accepts `{ url, variant }`, uses `youtubei.js` for metadata and (optionally) `youtube-transcript` for transcripts when `variant === 'shorts'` or standard videos.
- `api/scrape/tiktok.ts`: Call TikTok oEmbed. Document that duration and view count are not available; return whatever metadata exists and flag missing fields.
- `api/scrape/instagram.ts`: Use `open-graph-scraper`. Indicate in the payload when only partial data is returned (private content, etc.).

Shared behaviour:
- Wrap each step in try/catch and return `{ success: false, error, recoverable: boolean }` to help the UI decide on fallbacks.
- Enforce request timeouts (AbortController on `fetch`) to avoid hanging serverless functions.

#### 2.4 Progress updates without faux WebSockets
- Each handler returns a structured payload including `stepsCompleted` or `warnings`.
- The frontend derives progress states from actual async promises (detection, metadata fetch, transcript). No artificial `setTimeout` delays.

---

### Phase 3 - Frontend Experience

#### 3.1 `useVideoExtraction` hook
**File:** `src/hooks/useVideoExtraction.ts`
- Manage an `AbortController` so cancellation stops the in-flight fetch.
- Model steps as `detectPlatform`, `fetchMetadata`, `fetchTranscript`, `assembleResource`.
- Emit progress percentages (for example 20, 60, 80, 100) based on real completion, not timers.
- Return `{ success, metadata, platform, variant, warnings }`.

#### 3.2 URL input modal
**File:** `src/components/video/VideoUrlModal.tsx`
- Show detection results using the normalised `platform` plus optional `variant`.
- Display capability caveats (for example, "TikTok duration not available via public endpoints").

#### 3.3 Progress overlay
**File:** `src/components/video/ExtractionProgress.tsx`
- Drive UI directly from hook step states.
- Disable the cancel button only while an irreversible server request is in flight; otherwise cancel triggers `AbortController.abort()` and resets state.
- Surface warnings (for example, partial metadata) before navigating away.

#### 3.4 Dashboard entry points
**File:** `src/pages/Dashboard.tsx`
- Primary hero button: `Add Short-form Video` (opens modal).
- Quick Actions section: add a tile that opens the same modal so the feature lines up with the feature plan commitments.

#### 3.5 Pre-filled resource form
**File:** `src/pages/NewResource.tsx`
- Read `location.state.prefilledData` and map it into existing `formData` fields.
- Auto-select the `video` type, set `shortFormPlatform`, and apply optional fields from `shortFormFieldMap`.
- Display a success banner sourced from `extractionResult`.
- Update `handleSubmit` to persist `shortFormPlatform` and `shortFormMetadata` (convert hashtags input to an array, coerce view count to `number`).
- Ensure tags are deduplicated and trimmed before saving.

#### 3.6 Local storage syncing
**File:** `src/data/storageAdapter.ts`
- When calling `addResource` or `updateResource`, include the new metadata fields so both adapters remain symmetrical.

---

## 4. Why This Plan Is Stable Long-term
- **Schema-safe:** Keeping `type: 'video'` avoids Supabase migrations while still capturing platform-specific details.
- **Consistent UX:** Progress steps reflect real async operations, and cancellation genuinely aborts work.
- **Extensible:** Adding another short-form provider only requires updating the detection map, providing a new API route, and merging fields into `shortFormFieldMap`.
- **Operationally sound:** Lighter dependencies reduce cold-start times; timeouts and warnings prevent opaque failures.
- **Maintainable forms:** Optional field handling means existing resource creation is untouched, while auto-filled entries remain editable.

## 5. Known Limitations
- TikTok and Instagram APIs expose limited metadata; we only guarantee title, creator, URL, and hashtags when present.
- Transcripts are provided for YouTube Shorts only; adding ASR will be considered in a later phase.
- Rate limiting and caching is deferred until we observe real-world load.
