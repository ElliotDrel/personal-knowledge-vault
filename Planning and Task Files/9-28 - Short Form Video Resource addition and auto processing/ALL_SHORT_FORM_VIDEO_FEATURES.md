# Short-Form Video Feature Specification (Updated)

## What We Are Building

A short-form video ingestion capability that transforms TikTok, YouTube Shorts, and Instagram Reels into structured `video` resources inside the existing knowledge vault while keeping all automated extraction on secure backend infrastructure.

## Core Goals

### Primary Objectives
- **Effortless Capture**: Paste a supported URL and let the system populate short-form metadata or fall back to manual entry.
- **Smart Processing**: Run metadata and transcript extraction on a Supabase Edge Function so the browser only coordinates the job.
- **Unified Management**: Continue using the `video` resource type with enriched `metadata.shortForm*` fields so dashboards, filters, and search stay functional.
- **Universal Access**: Support in-app paste, iOS Shortcuts, and direct links without duplicating processing logic.

### Knowledge Management Goals
- **Content Focus**: Capture creator data, captions, and key hashtags; ignore engagement vanity metrics.
- **Rich Context**: Store extraction timestamp, source URL, and warnings for jobs that partially succeed.
- **Future Sharing**: Keep metadata normalized to support future sharing features built on existing resource structures.
- **Long-term Value**: Preserve references even when the original video disappears; retain manual fallback path.

## Feature Overview

### Supported Platforms
1. **TikTok Videos**: Metadata via TikTok oEmbed proxied through the Edge Function; hashtags parsed server-side.
2. **YouTube Shorts**: Metadata via YouTube Data API v3; transcript retrieval attempted when compliant, otherwise surfaced as manual task.
3. **Instagram Reels**: Metadata via Instagram oEmbed for public posts; clearly communicate limitations for private or login-gated reels.

### Resource Representation
- All short-form assets remain `type: 'video'`.
- Store platform-specific fields inside `metadata.shortFormPlatform`, `metadata.handle`, `metadata.hashtags`, `metadata.duration`, `metadata.sourceUrl`.
- Track extraction provenance (`metadata.shortFormExtractionMethod`, `metadata.shortFormExtractedAt`, `metadata.shortFormWarnings`).

## User Experience Design

### Entry Points
1. **Dashboard "Add Short Video" Button**: Launches the new `/resources/process` route with a guided paste flow.
2. **URL Paste Field**: Detects platform instantly, lets user continue with automated processing or opt for manual creation.
3. **iOS Shortcuts Integration**: Sends normalized URL to the processing route; shortcut waits for completion or receives a status link.
4. **Direct Browser Links**: `/resources/process?url=<encoded>` deep links resume existing jobs where possible.

### Processing Flow Design
```
Paste URL -> Processing Page -> Backend Job -> Polling Updates -> Resource Created
```

**Step 1: URL Input**
- User pastes URL; client-side detection validates and normalizes it.
- Unsupported or private URLs surface instant guidance and manual create option.

**Step 2: Processing Page Experience**
- Route creates/recovers a processing job via Supabase Edge Function.
- Real-time polling shows backend progress (`detecting`, `metadata`, `transcript`, `complete`).
- Clear warnings when automation falls back to partial data.

**Step 3: Durable Background Work**
- Edge Function persists job state in `processing_jobs` table; work continues if the tab closes.
- Client stores `jobId` in `sessionStorage` so reopening the page resumes polling.

**Step 4: Completion**
- On success, frontend creates/updates the `video` resource using the hybrid storage adapter.
- Manual fallback path retains original URL in notes if automation fails.

### Visual Language
- **Progress Indicators**: Linear progress bar and textual step indicator sourced from backend status.
- **Platform Badges**: Show TikTok/YouTube/Instagram icons wherever `shortFormPlatform` metadata is present.
- **Warning Callouts**: Highlight partial successes (e.g., metadata found, transcript missing).

## Technical Decisions (Updated)

### Processing Architecture
- **Backend**: Supabase Edge Function (`supabase/functions/short-form`) orchestrates extraction, writes to `processing_jobs` table, and returns structured metadata.
- **Client**: React page kicks off jobs, polls `/short-form/status`, and handles retries/redirects.
- **Durability**: Jobs identified by `user_id + normalized_url`; retries reuse existing job instead of spawning duplicates.
- **Fallbacks**: Manual entry always available; backend returns granular status codes (`unsupported`, `quota_exceeded`, `privacy_blocked`).

### Platform Integration Strategy
- **YouTube Shorts**: Use YouTube Data API v3 for metadata (requires `YOUTUBE_API_KEY`). Investigate compliant transcript sources; if none, flag to user.
- **TikTok**: Use TikTok oEmbed via backend proxy; cache results to respect rate limits.
- **Instagram Reels**: Use Instagram oEmbed for public reels; no scraping of private/login-gated content.
- **No Social Metrics**: Focus on educational metadata; omit views/likes to stay within scope.

### Data Handling
- **Resource Creation**: Existing storage adapter writes metadata JSON; no enum changes needed.
- **Job Tracking**: `processing_jobs` table stores status, error codes, backend payload, timestamps.
- **Secrets**: API keys stored in Supabase config, not shipped to client.

### Error Handling Philosophy
- **Graceful Degradation**: Save resource shell with URL even when automation fails.
- **Transparent Messaging**: Backend returns actionable error codes; frontend explains next steps.
- **Retry Strategy**: Exponential backoff on transient network/API errors; surface retry-after guidance.
- **Audit Trail**: Each job retains `warnings` array so users know what data might be missing.

## Integration with Existing Features

### Resource Management
- Dashboards, filters, and search continue to treat short-form entries as `video` items.
- Filtering by `metadata.shortFormPlatform` enables platform-specific views without schema changes.
- Notes and transcripts remain editable in the existing editor.

### Storage System
- Hybrid adapter untouched; automated flow simply seeds metadata before persistence.
- LocalStorage mode stores job results locally while still relying on backend for extraction (job ids keyed by `user-less` anonymous session or temporary identifier).

### Future Enhancements
- Extend job table to support batching multiple URLs.
- Add notification hooks (email/push) once Supabase functions support background triggers.
- Explore user-provided API keys for higher-rate quotas where permissible.

## Success Metrics

### User Experience
- Paste-to-resource flow succeeds in under 15 seconds for public videos.
- Manual fallback triggered in <15% of attempts (excluding private/deleted content).
- Users rate processing feedback as "clear" in qualitative testing.

### Technical
- Edge Function error rate <2% (excluding external privacy blocks).
- Job duplicates reduced to zero thanks to normalized URL idempotency.
- Resource creation remains backward-compatible (no changes to `resource_type`).

### Knowledge Management
- Short-form resources contribute to search index via metadata/transcripts.
- Extraction timestamps stored for every automated entry to aid future auditing.

## Final Design Principles

### User-Centric
- Keep the workflow predictable and fail-safe; automation augments manual control.
- Provide honest status and guidance instead of silent failures.

### Technical Discipline
- Respect provider terms of service, rate limits, and authentication requirements.
- Prefer maintainable, testable backend logic over fragile client-side scraping.

### Content Stewardship
- Attribute creators clearly and store source URLs for provenance.
- Do not redistribute video content; focus on metadata and transcripts only when permitted.


