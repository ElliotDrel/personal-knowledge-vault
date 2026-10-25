# Personal Knowledge Vault

Desktop-first, resource-centric knowledge app with notes, transcripts, and simple sharing (feature-flagged). Built with React + Vite, Supabase (auth + DB), Tailwind, and shadcn/ui.

This README summarizes the current state of the codebase and the near‑term roadmap based on the planning documents under `Planning and Task Files/`.

---

## Status at a Glance

- Core app (auth, storage, CRUD, UI): ✅ Implemented
- Short-form URL processing (YouTube Shorts): ✅ Operational via Supabase Edge Function
- Short-video type refactor (new `short-video` type): 🔄 In progress (branch: `refactor/storage-and-types-short-video-schema-migration`)
- Sharing system (DB + adapter + UI): ✅ Implemented, but 🔒 disabled by feature flag
- Email delivery for sharing (providers, templates, edge function): 📋 Planned

See the detailed plans in `Planning and Task Files/`:
- 10-2 Short Video Type Refactor: `SHORT_VIDEO_TYPE_REFACTOR_FEATURES.md`, `SHORT_VIDEO_TYPE_REFACTOR_IMPLEMENTATION_PLAN.md`
- 9-28 Short-Form Video: platform plans and current implementation status
- 9-27 Sharing Feature: status, feature flags, and next steps
- 9-30 URL Processing Refactor: shipped UX changes

---

## Tech Stack

- React 18 + TypeScript + Vite 7
- Tailwind CSS + shadcn/ui
- TanStack Query, React Router
- Supabase (Auth, Postgres, Edge Functions)

---

## Getting Started

Prerequisites:
- Node.js 18+

Install and run:
```sh
npm install
npm run dev
```

Build & preview:
```sh
npm run build
npm run preview
```

Lint & typecheck:
```sh
npm run lint
npm run typecheck
```

Environment variables (`.env.local`):
```sh
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Feature flags
VITE_ENABLE_SHARING=false
```

Optional (email system, planned):
```sh
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Knowledge Vault
```

---

## Key Capabilities

- Resource management: create, list, filter, search, edit
- Notes and transcripts: markdown editor with persistence
- Auth: Supabase magic link (email) with route protection
- Hybrid storage: Supabase for authenticated users; localStorage fallback
- Short-form processing flow:
  - Dashboard URL input (refactor shipped) → `/resources/process` status page
  - YouTube Shorts extraction via Supabase Edge Function (`supabase/functions/short-form`)
  - Durable job tracking (`processing_jobs` table) and polling UI

---

## Sharing Feature (Feature-Flagged)

- Status: Implemented end-to-end (DB schema, adapter methods, UI) but disabled by default.
- Enable (dev): set `VITE_ENABLE_SHARING=true` then restart dev server.
- Code locations:
  - UI: `src/components/sharing/`
  - Data: `src/data/storageAdapter.ts`, `src/data/supabaseStorage.ts`
  - DB: `supabase/migrations/20250927022932_add_sharing_schema.sql`, `20250927023027_add_sharing_rls_policies.sql`
- Email delivery: providers, templates, and edge function are planned (see planning docs).

---

## Short-Form Video — Current vs Refactor

Current (shipped):
- Short-form URLs (YouTube Shorts) are processed via an Edge Function and saved as `type: 'video'` with short-form metadata stored in JSON.

Refactor (in progress):
- Promote short-form into a dedicated `type: 'short-video'` with flattened top-level fields (e.g., `platform`, `channelName`, `handle`, `viewCount`, `hashtags`, `extractedAt`, `extractionMethod`).
- Includes Supabase enum changes, data migration, partial index for platform, storage adapter updates, and UI updates (filters, cards, details).
- See:
  - `Planning and Task Files/10-2 - Short Video Type Refactoring/SHORT_VIDEO_TYPE_REFACTOR_FEATURES.md`
  - `Planning and Task Files/10-2 - Short Video Type Refactoring/SHORT_VIDEO_TYPE_REFACTOR_IMPLEMENTATION_PLAN.md`

---

## URL Processing Workflow (Shipped)

1) Paste URL on Dashboard → detection via `useUrlDetection`
2) If processable short-form URL → navigate to `/resources/process?url=...` and auto-start job
3) Poll status; on success, resource is created/updated via the storage adapter
4) If unsupported, navigate to manual create with URL pre-filled (`/resources/new?url=...`)

Related files:
- `src/pages/Dashboard.tsx`
- `src/pages/ProcessVideo.tsx` (status-only monitor)
- `src/pages/NewResource.tsx` (manual fallback w/ URL prefill)
- `src/utils/urlDetection.ts`, `src/hooks/useUrlDetection.ts`

---

## Supabase: Local Migrations & Edge Functions

Typical local workflow (safe environment):
```sh
# Reset DB to local state (destructive in local dev)
npx supabase db reset

# Apply new migrations
npx supabase db push

# Deploy the short-form function (requires Supabase project link)
npx supabase functions deploy short-form
```

YouTube API secret (for deployed function):
```sh
npx supabase secrets set YOUTUBE_API_KEY=your_key
```

Short-video refactor migrations (planned): see the 10-2 refactor plan for SQL files, validation queries, and rollback notes.

---

## Project Structure

```
src/
  components/
  contexts/
  data/
  hooks/
  lib/
  pages/
  types/
  utils/
supabase/
  functions/short-form/
  migrations/
```

Notable entry points:
- App shell and routes: `src/App.tsx`, `src/pages/*`
- Auth context: `src/contexts/AuthContext.tsx`
- Storage adapter: `src/data/storageAdapter.ts`, `src/data/supabaseStorage.ts`
- Short-form function: `supabase/functions/short-form/*`

---

## Scripts

- `dev`: start Vite dev server
- `build`: production build
- `preview`: preview built app
- `lint`: ESLint
- `typecheck`: TypeScript compile check (no emit)

Planned:
- `migrate:local-short-videos`: LocalStorage migration for short-video refactor (see implementation plan).

---

## Roadmap (High-Level)

- Short-video type refactor: DB enum + data migration, storage/types update, UI filters/cards/details, CSS tokens
- Email system for sharing: provider factory, templates, and edge function for sending invitations
- Tests and hardening: unit/integration/E2E, observability for Edge Functions, lint/type/build gates
- Deployment: staging checks, environment configuration, and production rollout notes

See detailed checklists and acceptance criteria in the planning files.

---

## License

Personal project; no explicit license provided.
