# Instagram Reels Ingestion — Implementation Plan & Status

## Overview & Strategy
- **Approach**: Backend-assisted ingestion using Supabase Edge Functions to proxy Instagram oEmbed responses while keeping the client lean.
- **Goal**: Convert public Instagram Reels URLs into structured `video` resources with durable job tracking, clear error messaging, and manual fallbacks.
- **Integration**: Extend existing storage adapter and re-use `metadata.shortForm*` fields for platform-specific metadata without altering resource types.

## Current Status (Updated 2025-09-29)
- **Overall**: ✅ Foundation ready; awaiting oEmbed integration and compliance validation.
- **Completed Elements**:
  - ✅ `processing_jobs` table deployed with RLS, triggers, and indexes.
  - ✅ URL detection utilities recognize Instagram reels and share links.
  - ✅ `/resources/process` UI supports platform detection, badges, and manual fallback.
  - ✅ Edge Function infrastructure prepared to add Instagram handler.
- **Pending Work**:
  - Implement Instagram oEmbed proxy with rate-limit handling.
  - Surface private/login-required messaging in UI.
  - Add automated tests covering Instagram flows.

## Phase Breakdown

### Phase 0: Preparation & Alignment (✅ Completed)
- Shared API contracts defined in `src/types/shortFormApi.ts` include Instagram-specific fields.
- Supabase migration `20250928000001_add_processing_jobs.sql` active with job tracking and cleanup.
- Edge Function scaffold includes modular URL normalization and logging utilities ready for Instagram integration.
- Supabase CLI workflow verified; secrets storage pattern established for future tokens if required.

### Phase 1: URL Detection & Manual Flow (✅ Completed)
- `urlDetection.ts` handles `instagram.com/reel/` and related share URLs.
- React hooks (`useUrlDetection.ts`) provide validation, clipboard monitoring, and manual fallback entry.
- `/resources/process` route displays Instagram platform badge and fallback options.
- Resource creation reuses hybrid storage adapter for both automated and manual entries.
- **Next**: Add Vitest coverage for Instagram detection cases.

### Phase 2: Edge Function Extractors (🚧 In Progress)
- Add Instagram handler within `supabase/functions/short-form/` to proxy oEmbed requests.
- Normalize response fields (author_name, title, thumbnail_url) into structured metadata.
- Manage rate limits and login-required responses with meaningful status codes (`privacy_blocked`, `unsupported`).
- Cache successful oEmbed results to reduce repeated calls when users retry.
- Ensure no scraping of private content; respect Instagram terms of service.

### Phase 3: Durable Processing Jobs (✅ Completed Foundation)
- Jobs stored with status, warnings, and payloads; ready to record Instagram-specific data.
- Idempotency via `(user_id, normalized_url)` ensures re-runs resume existing jobs.
- Status endpoint returns progress and warnings for UI display.

### Phase 4: Processing Experience UI (✅ Completed Foundation)
- UI renders Instagram badge, progress bar, and warning callouts.
- Manual fallback always available, pre-populating the normalized URL.
- Pending updates to display specific warnings for private content or rate limits once backend statuses are finalized.
- **Next**: Add Playwright scenario covering Instagram URL processing (public vs private cases).

### Phase 5: Entry Points & Integrations (📝 Planned)
- Dashboard quick action for Instagram ingestion once backend handler ships.
- Resource cards display Instagram badge, caption preview, and extraction timestamp.
- Document iOS Shortcut usage for Reels ingestion, clarifying public-only support.
- Ensure deep links `/resources/process?url=` resume existing Instagram jobs by normalized URL.

### Phase 6: Observability & Launch Hardening (📝 Planned)
- Add structured logs and metrics to track oEmbed latency, failure rates, and privacy blocks.
- Configure alerts for repeated `privacy_blocked` or `rate_limited` responses.
- Finalize documentation and known limitations for private or login-required reels.
- Run full test suite prior to launch: lint, typecheck, build, E2E, Supabase DB lint.

## Testing Strategy
- **Unit Tests**: URL detection normalization for Instagram share links, manual fallback behavior.
- **Integration Tests**: Edge Function hitting mock oEmbed, verifying response mapping and status handling.
- **E2E Tests**: Process flow for public reel success, private reel fallback, rate limit error messaging.
- **Monitoring**: Inspect Supabase logs for oEmbed response patterns and failure reasons.

## Risks & Mitigations
- **Private/Login-Required Content**: Clearly message limitations, encourage manual entry, and avoid unauthorized scraping.
- **oEmbed Rate Limits**: Implement caching, monitor usage, and expose retry guidance; consider alternative APIs if approved.
- **Policy Changes**: Track Instagram API policy updates; isolate integration logic for easier updates.
- **Content Removal**: Maintain resource shells with original URL and warn users when media becomes unavailable.

## Implementation Summary & Next Steps
- ✅ Infrastructure ready; detection and UI foundations complete.
- 🔄 Build and deploy Instagram oEmbed proxy within the Edge Function.
- 🔄 Update frontend to display Instagram-specific warnings and manual fallback guidance.
- 🔄 Add automated tests and documentation ahead of release.
- 📌 Monitor rollout for rate-limit issues and adjust caching or user guidance as needed.


