# TikTok Ingestion — Implementation Plan & Status

## Overview & Strategy
- **Approach**: Backend-assisted ingestion using Supabase Edge Functions to proxy TikTok oEmbed (or approved APIs) while keeping the client lightweight.
- **Goal**: Convert TikTok video URLs into structured `video` resources with durable job tracking, reliable metadata extraction, and graceful fallbacks.
- **Integration**: Reuse existing storage adapter and `metadata.shortForm*` fields to maintain compatibility across the app.

## Current Status (Updated 2025-09-29)
- **Overall**: ✅ Foundations complete; awaiting TikTok-specific backend integration and compliance approvals.
- **Completed Elements**:
  - ✅ `processing_jobs` table deployed with RLS, triggers, and indexes for job tracking.
  - ✅ URL detection utilities recognize TikTok URLs, share links, and mobile variants.
  - ✅ `/resources/process` UI supports TikTok detection, badges, and manual fallback.
  - ✅ Edge Function architecture prepared to add TikTok handler modules.
- **Pending Work**:
  - Implement TikTok oEmbed proxy handler with normalization and rate-limit handling.
  - Manage geo-blocked/private content messaging in UI.
  - Add automated tests covering TikTok flows.

## Phase Breakdown

### Phase 0: Preparation & Alignment (✅ Completed)
- Shared TypeScript contracts in `src/types/shortFormApi.ts` include TikTok-specific fields.
- Supabase migration `20250928000001_add_processing_jobs.sql` active with job state management and cleanup routines.
- Edge Function scaffold includes auth, logging, URL normalization, and modular structure ready for TikTok support.
- Supabase CLI workflow validated; secrets pattern established for future tokens.

### Phase 1: URL Detection & Manual Flow (✅ Completed)
- `urlDetection.ts` handles `tiktok.com/@handle/video/`, `vm.tiktok.com/`, and `www.tiktok.com/t/` short URLs.
- React hooks provide real-time validation, clipboard integration, and manual fallback prompts.
- `/resources/process` route highlights TikTok badge and offers manual creation path with URL pre-filled.
- Resource creation reuses hybrid storage adapter for automated or manual entries.
- **Next**: Add Vitest tests for TikTok normalization logic.

### Phase 2: Edge Function Extractors (🚧 In Progress)
- Build TikTok handler within `supabase/functions/short-form/` to proxy oEmbed or approved APIs.
- Normalize returned data (author_name, title, thumbnail_url, embed data) into structured metadata.
- Handle rate limits, region restrictions, and private content with specific status codes (`privacy_blocked`, `region_blocked`, `rate_limited`).
- Cache successful responses to reduce repeated external calls.
- Document compliance expectations—no scraping beyond approved endpoints.

### Phase 3: Durable Processing Jobs (✅ Completed Foundation)
- Job lifecycle ready to track TikTok-specific statuses and warnings.
- Idempotent processing ensures re-runs reuse existing jobs via normalized URLs.
- Status endpoint returns progress, warnings, and next recommended actions for UI.

### Phase 4: Processing Experience UI (✅ Completed Foundation)
- UI shows TikTok badge, progress steps, and warning callouts.
- Manual fallback available for geo-blocked or private videos.
- Pending updates to reflect TikTok-specific status messages (e.g., "Region restricted").
- **Next**: Add Playwright scenario for TikTok flow once backend handler is implemented.

### Phase 5: Entry Points & Integrations (📝 Planned)
- Dashboard quick action to launch processing page with TikTok detection.
- Resource cards display TikTok badges, captions, and extraction timestamps.
- iOS Shortcut documentation illustrating share-to-processing workflow and manual fallback when blocked.
- Deep-link handling ensures `/resources/process?url=` resumes existing TikTok jobs by normalized URL.

### Phase 6: Observability & Launch Hardening (📝 Planned)
- Add structured logs and metrics for TikTok job outcomes, including rate-limit and region-blocked counts.
- Configure alerts for sustained failures or quota issues.
- Finalize documentation and known limitations (private accounts, geo-restrictions).
- Run full test suite prior to launch: lint, typecheck, build, E2E, Supabase DB lint.

## Testing Strategy
- **Unit Tests**: TikTok URL normalization, detection utility edge cases, manual fallback triggers.
- **Integration Tests**: Edge Function hitting mock oEmbed responses, validating normalization and status codes.
- **E2E Tests**: Flow for public video success, region-blocked fallback, and rate-limit messaging.
- **Monitoring**: Review Supabase logs for response types and frequency of warnings.

## Risks & Mitigations
- **Geo-Restrictions**: Detect region blocks early, provide manual fallback guidance, and consider caching previously accessible data.
- **Private Accounts**: Surface clear messaging, avoid unauthorized scraping, and rely on manual entry.
- **Rate Limits**: Cache results, monitor usage, and provide retry-after guidance; plan API key escalation if available.
- **Policy Changes**: Track TikTok API updates; keep integration logic isolated for quick adjustments.

## Implementation Summary & Next Steps
- ✅ Infrastructure and UI foundation ready for TikTok support.
- 🔄 Build and deploy TikTok oEmbed proxy handler with robust error handling.
- 🔄 Update UI warnings and documentation for TikTok-specific scenarios.
- 🔄 Add automated tests and observability before enabling the feature broadly.
- 📌 Monitor rollout for rate-limit or geo-restriction issues and refine fallback strategies.


