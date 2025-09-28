# Short-Form Video Feature - Implementation Plan & Status

## Overview & Strategy
- Approach: Backend-assisted ingestion; keep client lightweight while delegating network calls to Supabase Edge Functions.
- Goal: Convert TikTok, YouTube Shorts, and Instagram Reels URLs into structured `video` resources with durable job tracking and clear UX feedback.
- Integration strategy: Extend existing storage adapter and UI components; reuse `metadata.shortForm*` fields instead of expanding the `resource_type` enum.
- Processing architecture: Edge Function orchestrates extraction, persists job status, and returns normalized metadata to the client for final resource creation.

## Current Status (Updated 2025-09-27)
- Overall feature: Not yet started; preparation work required before implementation sprints begin.
- Dependencies ready:
  - Supabase project linked with migrations folder and Edge Function support.
  - Hybrid storage adapter currently serving Supabase/localStorage modes.
  - UI infrastructure (React Router routes, dashboard widgets) ready for extension.
- Outstanding prerequisites:
  - Compliance confirmation for provider APIs.
  - API contract approval for new Edge Function endpoints.

## Phase 0: Preparation & Alignment (Status: Planned)
- Document mapping between feature spec goals and engineering tasks; capture in project tracker.
- Review provider terms for YouTube Data API, TikTok oEmbed, Instagram oEmbed; decide on transcript scope.
- Draft request/response schemas for `/functions/v1/short-form/process` and `/functions/v1/short-form/status` including error codes.
- Produce sequence diagram showing client -> Edge Function -> Supabase job table interactions and manual fallback path.
- Validate Supabase CLI authentication, environment variable management, and deployment workflow.

## Phase 1: URL Detection & Manual Flow (Status: Planned)
- Build `src/services/urlDetection.ts` with normalization helpers for supported domains.
- Add Vitest coverage for positive and negative URL cases, including mobile and short links.
- Update `NewResource` workflow to display platform-specific metadata fields inside existing `video` configuration.
- Implement a paste-first entry point that stores detected URL in router state/sessionStorage and allows immediate manual creation.
- Ensure both Supabase and localStorage paths persist enriched metadata fields.

## Phase 2: Supabase Edge Function Extractors (Status: Planned)
- Scaffold `supabase/functions/short-form/` with shared DTO definitions (`types.ts`).
- Configure environment secrets (`YOUTUBE_API_KEY`, optional TikTok/Instagram tokens) via Supabase CLI.
- Implement extractor modules:
  - YouTube Shorts: call YouTube Data API v3; attempt transcript retrieval when compliant, emit warnings otherwise.
  - TikTok: call TikTok oEmbed through Edge Function to avoid CORS; parse author, caption, hashtags, thumbnails.
  - Instagram Reels: call Instagram oEmbed for public reels; detect privacy blocks and return actionable errors.
- Normalize extractor outputs into `{ status, metadata, transcript?, warnings[] }` contract.
- Add Deno unit tests with mocked fetch responses covering success, quota, privacy, and unsupported cases.
- Deploy function to staging using `npx supabase functions deploy short-form` and run smoke tests.

## Phase 3: Durable Processing Jobs (Status: Planned)
- Create migration `<timestamp>_add_processing_jobs.sql` adding `processing_jobs` table with columns: `id UUID`, `user_id UUID`, `normalized_url TEXT`, `platform TEXT`, `status TEXT`, `last_step TEXT`, `error_code TEXT`, `metadata JSONB`, `warnings TEXT[]`, timestamps.
- Add indexes on `(user_id, normalized_url)` for idempotency and `(status, created_at)` for cleanup.
- Implement trigger to update `updated_at` automatically.
- Update Edge Function to upsert job rows at start, update progress per step, and mark completion/errors.
- Expose `/functions/v1/short-form/status` handler that validates Supabase JWT, reads job, and returns sanitized status plus retry-after hints.
- Configure scheduled cleanup (Supabase cron) to archive jobs older than retention window.
- Validate migration with `npx supabase db lint` and add Deno integration test for job lifecycle.

## Phase 4: Processing Experience UI (Status: Planned)
- Add `/resources/process` route and `ProcessVideo` page handling URL query parsing and job initiation.
- Persist `jobId` and normalized URL in sessionStorage to resume polling after navigation or refresh.
- Poll status endpoint via React Query with exponential backoff honoring server-provided retry hints.
- Render progress bar, step descriptions, platform badge, and warning callouts; surface manual fallback on errors or unsupported status.
- On completion, invoke storage adapter to create/update `video` resource using returned metadata and transcript.
- Cover success, partial success, and failure flows with component tests and Playwright scenarios.

## Phase 5: Entry Points & Integrations (Status: Planned)
- Dashboard: add "Add Short Video" quick action linking to processing route; show platform badges on resource cards when metadata present.
- Inline URL input: embed detection widget on dashboard with clear validation and navigation to processing page.
- iOS Shortcut integration: document API usage (URL + auth token) and return payload (job status link or resource id).
- Deep link support: ensure `/resources/process?url=` recovers existing job by normalized URL check before spawning a new one.
- Filters & search: enable filtering by `metadata.shortFormPlatform` without altering enums.

## Phase 6: Observability, Hardening, Launch (Status: Planned)
- Instrument Edge Function with structured logs, error metrics, and performance timing; configure alerts via Supabase log drains.
- Implement rate-limit handling with capped retries, retry-after messaging, and user-facing warnings.
- Finalize documentation: user help content, internal runbook, API references, known limitations.
- Run release checklist: `npm run lint`, `npm run typecheck`, `npm run build`, E2E suite, `npx supabase db lint`, staging smoke tests.
- Prepare production launch: rotate API keys if needed, update Vercel environment variables, monitor initial usage, and capture backlog items (batching, notifications).

## Milestones & Testing Checkpoints
- Day 3: Phase 0 deliverables approved (contracts, compliance notes, diagrams).
- Day 7: Manual capture flow (Phase 1) merged with detection tests passing.
- Day 12: Edge Function extractors live in staging with smoke tests (Phase 2).
- Day 16: Processing jobs migration + status endpoint deployed (Phase 3).
- Day 21: Processing UI with polling and resource creation shipped (Phase 4).
- Day 24: Entry points and metadata integrations complete (Phase 5).
- Day 27: Observability and launch checklist finished; feature ready for release (Phase 6).

Testing checkpoints:
- Unit: URL detection helpers, React components, Deno extractors.
- Integration: Edge Function hitting staging APIs, job lifecycle validation, storage adapter writes.
- End-to-end: Manual fallback, automated success, error handling, Supabase vs localStorage modes.

## Key Libraries & Tools
- Frontend: React 18, Vite 7, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query.
- Backend: Supabase Edge Functions (Deno), Supabase Postgres migrations, Supabase CLI.
- Supporting APIs: YouTube Data API v3, TikTok oEmbed, Instagram oEmbed (subject to compliance).
- Testing: Vitest, Playwright, Deno test runner.

## Risks & Mitigations
- Third-party quotas or privacy blocks: cache results, expose manual fallback, document unsupported scenarios.
- Transcript availability: if captions API access is restricted, omit transcript and flag to users.
- Edge Function execution limits: keep dependencies slim, stream responses carefully, monitor runtime logs.
- Compliance changes: establish monitoring for provider policy updates and plan fallback workflows.

## Additional Notes
- All SQL migrations must remain ASCII-only to satisfy deployment requirements.
- Storage adapter should remain the single entry point for resource persistence to prevent duplication.
- Manual entry path must stay available even after automation launches to ensure resilience.
