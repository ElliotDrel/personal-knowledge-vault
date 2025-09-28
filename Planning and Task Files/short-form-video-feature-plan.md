# Short-Form Video Auto-Extraction Feature Plan

## 1. Feature Overview
Deliver an intelligent flow that extracts metadata from short-form video URLs and pre-fills a resource entry so users can review, enrich with personal notes, and save it to their knowledge base.

## 2. Supported Platforms & Capabilities
### TikTok Videos
- **Guaranteed metadata:** title or caption, creator username, canonical URL, thumbnail.
- **Best-effort metadata:** hashtags discovered in captions.
- **Unavailable:** duration, reliable view counts, transcript (blocked by API limitations).
- **Approach:** TikTok oEmbed (no auth) with hashtag parsing fallback.

### YouTube Shorts
- **Guaranteed metadata:** title, channel name, description, duration, thumbnail, URL.
- **Best-effort metadata:** hashtags or keywords, view count, transcript (via unofficial transcript API).
- **Approach:** `youtubei.js` for metadata plus `youtube-transcript` when captions are public.

### Instagram Reels
- **Guaranteed metadata:** caption when public, account name, canonical URL, thumbnail.
- **Best-effort metadata:** hashtags parsed from caption.
- **Unavailable:** duration, view count, transcript for private accounts.
- **Approach:** `open-graph-scraper` against public Open Graph tags with clear error messaging for private content.

## 3. Core Functions
```typescript
detectPlatform(url: string): { platform: 'youtube' | 'tiktok' | 'instagram'; variant?: 'shorts'; isValid: boolean; error?: string; videoId?: string }
extractMetadata(args: { url: string; platform: Platform; variant?: 'shorts' }): Promise<ExtractedMetadata>
extractTranscript(args: { url: string; platform: Platform; variant?: 'shorts' }): Promise<string | null>
assembleResource(meta: ExtractedMetadata, platform: Platform, variant?: string): PrefillPayload
```
- Detection normalises Shorts to `platform: 'youtube', variant: 'shorts'` so the frontend always calls `/api/scrape/youtube`.
- Metadata extraction routes are platform-specific and may return `warnings` describing missing optional fields.
- Transcript extraction only runs for YouTube and gracefully returns `null` on failure.
- Resource assembly produces a payload containing `shortFormPlatform`, `shortFormMetadata`, and form defaults.

### Progress Tracking Contract
```typescript
export interface ExtractionState {
  step: 'detect' | 'metadata' | 'transcript' | 'assemble';
  percent: number; // 0-100 derived from completed steps
  status: 'pending' | 'active' | 'completed' | 'error';
  warnings?: string[];
}
```
- The UI renders four deterministic phases; no simulated timers or pseudo-WebSockets.
- Cancellation is supported through `AbortController` propagation.

## 4. User Experience Flow
1. **Dashboard Entry Points**
   - Hero button: `Add Short-form Video` next to `Add New Resource`.
   - Quick Actions tile: "Paste a short-form URL" shortcut.
2. **URL Modal**
   - Paste or type URL, auto-detection feedback, capability caveats per platform.
   - `Extract` triggers the extraction hook and closes the modal.
3. **Progress Overlay**
   - Four-step progress indicator bound to real async events.
   - Cancel button aborts the request unless the current step has already completed server-side.
4. **Pre-filled Form (NewResource)**
   - Auto-selects `video` type, injects `shortFormPlatform` flag, and exposes optional short-form fields when data exists.
   - Shows success banner and any warnings (for example, missing view count).
   - User reviews or adds notes, then saves the resource.
5. **Post-save Navigation**
   - Redirect to the newly created resource detail page.

## 5. Resource Configuration
- `video` remains the canonical resource type.
- Introduce `optionalShortFormFields` metadata and `shortFormFieldMap` to gate display of handle, channel name, hashtags, and view count inputs.
- `shortFormMetadata` is persisted via both storage adapters so the detail page can present platform badges, stats, and extraction timestamps.

## 6. Technical Requirements
- **Frontend:** reuse existing React Router flow, add `AbortController` logic in the extraction hook, extend `NewResource` form handling.
- **Serverless:** Vercel API routes (`/api/scrape/detect`, `/api/scrape/youtube`, `/api/scrape/tiktok`, `/api/scrape/instagram`) with standard response envelopes `{ success, metadata?, warnings?, error?, recoverable }`.
- **Error Handling:** user-facing messages for private or removed content, retry guidance for transient failures, ability to continue with manual entry when extraction fails.

## 7. Success Metrics
- **Extraction completion rate:** >= 85% for public, supported URLs.
- **Average extraction time:** <= 8 seconds (YouTube transcript is the slowest step).
- **Manual override rate:** track how often users proceed after warnings to prioritise future optimisations.
- **Error transparency:** zero silent failures; every error produces a user-visible message and analytics event.

## 8. Future Enhancements
- Speech-to-text service for TikTok and Instagram transcripts.
- Batch URL ingestion with concurrency controls.
- Server-side caching or rate limiting once load warrants it.
- AI summarisation layered on top of transcripts.

## 9. Implementation Priorities
**MVP (ship together)**
1. Platform detection and serverless routes (YouTube, TikTok, Instagram) with warnings.
2. Cancellable extraction hook and progress overlay.
3. Form prefill pipeline including metadata persistence.
4. Dashboard and Quick Actions entry points.

**Post-MVP**
1. Enhanced Instagram fallbacks (for example, login-required proxy, if needed).
2. Improved analytics (usage metrics, warning counts).
3. UI embellishments (platform badges, colour accents).

**Later**
1. Batch processing, transcript search, AI summarisation.
2. Advanced error recovery (automatic retries, queued processing).
