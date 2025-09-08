# Lovable Build Prompt — Personal Knowledge Vault (Front-End MVP)

Project: Personal Knowledge Vault (resource-centric note-taking and sharing)
Scope: Build Phase 1–3 of the front end in one pass (no backend/auth yet). Deliver a desktop-first app with local persistence and mock data.

## Summary
- Goal: Organize knowledge by resource type (Books, Videos, Podcasts, Short‑form). Each resource has metadata, notes (markdown), and optional transcript. Implement an MVP front end with:
  - App scaffold, layout, and navigation
  - Add Resource flow with type-based dynamic forms
  - Resources listing with filter/search/sort
  - Resource details page with markdown notes and transcript section
  - Settings to customize fields per resource type (persisted locally)
- Constraints: Desktop-only; minimal complexity; Vercel-friendly; simple, non-technical operation.

## Tech Stack
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Editor: `@uiw/react-md-editor` (+ `@uiw/react-markdown-preview`)
- Forms: `react-hook-form`
- State: React Context + `localStorage`
- Utilities: `nanoid` (IDs), `clsx` (optional)
- Out of scope: Backend, auth, email, database, sharing

## Project Setup
1) Initialize a Next.js 14 TypeScript project using the App Router.
2) Install deps:
   ```bash
   npm install tailwindcss postcss autoprefixer \
     @uiw/react-md-editor @uiw/react-markdown-preview \
     react-hook-form nanoid clsx
   npx tailwindcss init -p
   ```
3) Configure Tailwind (base styles, desktop-first). Ensure `npm run dev` runs with no type errors.

## Folder Structure
```
app/
  layout.tsx                # Global layout (header/nav)
  page.tsx                  # Dashboard (/)
  resources/page.tsx        # Listing (/resources)
  resources/new/page.tsx    # Creation flow (/resources/new)
  resource/[id]/page.tsx    # Details (/resource/[id])
  settings/page.tsx         # Field configuration (/settings)
  login/page.tsx            # Placeholder only
components/
  Header.tsx
  NavLink.tsx
  ResourceCard.tsx
  ResourceForm.tsx          # Dynamic form renderer
  MarkdownEditor.tsx        # Wrapper around MDEditor
  SaveIndicator.tsx
  Filters.tsx               # Type filter, search, sort
lib/
  store.tsx                 # ResourcesProvider + persistence
  storage.ts                # localStorage helpers
  utils.ts                  # formatting/date helpers
types/
  index.ts                  # TypeScript interfaces
data/
  defaults.ts               # default types + sample resources
```

## Types / Interfaces (types/index.ts)
```ts
export type ResourceTypeKey = 'book' | 'video' | 'podcast' | 'short';

export interface ResourceType {
  id: string;
  key: ResourceTypeKey;
  name: string;
  fields: string[]; // field names; all text inputs
}

export interface Resource {
  id: string;
  typeKey: ResourceTypeKey;
  metadata: Record<string, string>;
  notes: string;
  transcript?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type SortOption = 'title' | 'createdAt' | 'updatedAt';
```

## Default Resource Types (data/defaults.ts)
- Books: Title, Author, Publication Year, Genre, Description
- Videos (long-form): Title, Creator, URL, Duration, Platform, Description
- Podcasts: Title, Host, Episode Number, URL, Duration, Description
- Short-form: Title, Creator, Platform, URL, Description

Seed 5–10 sample resources across types for a lively first-run experience.

## Local Persistence & State (lib/store.tsx, lib/storage.ts)
- Create a `ResourcesProvider` context exposing:
  - `resourceTypes: ResourceType[]`
  - `resources: Resource[]`
  - CRUD: `createResource`, `updateResourceMetadata`, `updateResourceNotes`, `updateResourceTranscript`, `deleteResource`
  - Config: `addField(typeKey, field)`, `removeField(typeKey, field)`
- Persist `resourceTypes` and `resources` to `localStorage` (e.g., keys: `kv_resource_types`, `kv_resources`).
- Initialize from defaults if no data exists.
- Use `nanoid()` for IDs; update `updatedAt` on any edit.

## Routing & Pages (App Router)
### `/` — Dashboard (app/page.tsx)
- Prominent buttons: “Add New Resource” → `/resources/new`; “Share Workspace” (placeholder)
- Recent resources (last 5 by `updatedAt`): title, type, date
- Quick links to Resources and Settings

### `/resources` — Listing (app/resources/page.tsx)
- Show all resources from state
- Filters:
  - Type dropdown: All / Book / Video / Podcast / Short
  - Text search: matches title + description (if present in metadata)
- Sorting: Title, Created, Updated
- Each item links to `/resource/[id]`

### `/resources/new` — Creation Flow (app/resources/new/page.tsx)
- Type selection grid: Book, Video, Podcast, Short-form
- On selection, render dynamic form from the current type’s `fields`
- Validation: Title required; others optional
- On submit: create, then redirect to `/resource/[id]`

### `/resource/[id]` — Details + Notes (app/resource/[id]/page.tsx)
- Layout:
  - Header: resource title + Edit button (toggle metadata edit mode)
  - Collapsible Metadata section (display or inline edit via same dynamic form)
  - Notes section: markdown editor (headers, lists, bold/italic; optional code)
  - Transcript section: only for `video` and `podcast` types; large textarea
- Saving (Phase 3): manual Save button + SaveIndicator (saved/unsaved)
- Persist to localStorage; bump `updatedAt` on save

### `/settings` — Field Configuration (app/settings/page.tsx)
- List all resource types with current `fields`
- Add field (text input), remove field buttons
- Persist changes to localStorage
- New/updated forms reflect configuration immediately

### `/login` — Placeholder (app/login/page.tsx)
- Placeholder only; no functionality in this scope

## Components
- `Header`: Title + nav to Dashboard, Resources, Settings; Login placeholder
- `ResourceCard`: title, type, created/updated dates; click to open
- `ResourceForm`: dynamic fields from `ResourceType.fields`, wired to `react-hook-form`
- `MarkdownEditor`: wraps `@uiw/react-md-editor` with toolbar (headers/lists/bold/italic)
- `Filters`: type dropdown + search + sort selector
- `SaveIndicator`: shows “Saved” vs “Unsaved changes” from dirty state

## UX Notes
- Desktop-only; no mobile/responsive work
- Clean, minimal Tailwind styling; readable typography; clear hierarchy
- Accessible labels for all form fields; helpful empty states
- Simple error states (e.g., title required)

## Data & ID Behavior
- `nanoid()` for `id`
- `createdAt`/`updatedAt` stored as ISO strings
- Update `updatedAt` on notes, transcript, or metadata changes

## Acceptance Criteria (Phase 1–3)
- App runs with `npm run dev` and no type errors
- Navigation works between `/`, `/resources`, `/resources/new`, `/resource/[id]`, `/settings`, `/login`
- Create resources via `/resources/new`:
  - Type selection works
  - Title required; others optional
  - Redirects to new resource page on success
- Listing:
  - Displays all resources
  - Type filter, text search (title + description), and sort work in-memory
- Resource details:
  - Metadata displays; toggling edit mode allows changes and saves
  - Notes editor loads existing notes; Save persists to localStorage
  - Transcript section appears only for Video/Podcast; saves with resource
  - SaveIndicator updates appropriately
- Settings:
  - Can add/remove fields per type; persists locally
  - Creation/edit forms reflect updated configuration
- Persistence:
  - All data persists across reloads via localStorage
- Out of scope: backend/auth/database/email/sharing/auto-save

## Non-Requirements (Defer)
- Magic link auth, `/shared/[token]`, shares/permissions UI
- Supabase/database; Resend/email; workspace sharing
- Auto-save (manual Save only in this phase)
- Mobile responsiveness

## Nice-to-Haves (If trivial)
- Confirm dialog when navigating away with unsaved changes
- Simple toasts for save/error
- Skeleton while hydrating from localStorage

## Developer Notes
- Use App Router client components for interactive views
- Keep code modular and typed; organize as outlined above
- Document localStorage keys and data shape in comments
- Avoid third-party UI kits; stick to Tailwind

## Sample Data (data/defaults.ts)
- Provide 5–10 resources total:
  - 2 Books, 2 Videos (YouTube-style), 1–2 Podcasts, 1–2 Short-form
- Include varied metadata, simple markdown notes (headers/lists), and one long transcript sample

