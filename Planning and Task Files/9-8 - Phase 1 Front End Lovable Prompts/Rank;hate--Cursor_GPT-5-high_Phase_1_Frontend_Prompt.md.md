# Lovable Prompt: Build "Personal Knowledge Vault" Frontend MVP

Build a desktop-focused, simple, resource-centric knowledge app for me and a few friends. Implement the initial frontend end-to-end so I can click around, create resources, write notes in markdown, and persist to localStorage, with a light settings UI for customizing resource fields. No backend or auth yet (just placeholders). Optimize for clarity and maintainability.

- **Project name:** Knowledge Vault
- **Audience:** Max 5 users total; non-technical user
- **Hosting:** Free tier friendly (Vercel)
- **Platform:** Desktop-only (no mobile required)
- **Priorities:** Simple, predictable, maintainable; minimal dependencies; beautiful but minimal UI

Build everything below in a single pass so I can run it immediately.

## Tech Stack and Setup

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (with `@tailwindcss/typography` for markdown rendering)
- `@uiw/react-md-editor` and `@uiw/react-markdown-preview` for notes editor
- `react-hook-form` for forms
- No state libraries; use React Context for data store
- Persistence: localStorage (Phase 1–3)
- Node 18+; use `crypto.randomUUID()` for IDs; avoid extra ID deps

**Setup commands:**
```bash
npx create-next-app@latest knowledge-vault --typescript --tailwind --app --eslint
cd knowledge-vault
npm install @uiw/react-md-editor @uiw/react-markdown-preview react-hook-form clsx
npm install -D @tailwindcss/typography
```

**Tailwind:**
- Add `@tailwindcss/typography` plugin
- Use font stack like Inter or system; clean, readable typography

## High-Level UX

- Clean, minimal, calm UI. Focus on content.
- Desktop-only layout; single column with max-width container for reading comfort.
- Simple navigation: Home, Resources, Settings (Login placeholder).
- **The workflow:**
  1. Add New Resource → choose type → dynamic form (required title) → redirect to resource page
  2. Write notes in markdown; Save manually (auto-save later)
  3. Resource listing supports search/filter/sort
  4. Settings: configure fields per resource type (add/remove text fields)

## Routes and Pages

### `/` Home Dashboard
- Welcome text
- Primary CTAs: "Add New Resource", "View All Resources", "Share Workspace" (non-functional placeholder)
- Recent 5 resources list

### `/resources` Resource Listing
- List/grid toggle (list default)
- Filter by type (Books, Videos, Podcasts, Short-form)
- Search by title substring
- Sort: Title (A–Z), Created, Last Modified
- Clicking opens `/resource/[id]`

### `/resources/new` Add New Resource
- Step 1: Select type (buttons/cards)
- Step 2: Dynamic form based on type config + always show a required Title field
- On submit: create resource, persist, redirect to `/resource/[id]`

### `/resource/[id]` Resource Page
- Header: Title, Type, buttons: Edit Metadata, Share (placeholder), Back
- Metadata section (collapsible): key-value pairs; Edit toggles inline form for metadata only (Title edited via Edit Metadata too)
- Notes: markdown editor (MDEditor) with preview; manual Save button and unsaved changes indicator
- Transcript: textarea bottom for Video/Podcast types only; persists with resource
- Show created/updated timestamps

### `/settings` Settings Page (Phase 4 light)
- Resource Type Configuration: for each type, show fields (string array) with add/remove controls
- Persist configurations to localStorage
- Reset to defaults button
- Share management placeholder section (UI only, no logic)

### `/login` Login (placeholder only)
- Email input and disabled "Send magic link" button; explanatory text that auth comes later

## Data Model (Frontend-only)

**Types:**
```ts
export type ResourceTypeId = 'book' | 'video' | 'podcast' | 'short';

export interface ResourceType {
  id: ResourceTypeId;
  name: string;
  fields: string[]; // text fields only (Title is always handled as a top-level field)
}

export interface Resource {
  id: string; // crypto.randomUUID()
  typeId: ResourceTypeId;
  title: string; // required, separate from metadata
  metadata: Record<string, string>; // key/value strings (exclude 'Title' here)
  notes: string;
  transcript?: string; // video/podcast only
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```

**Default resource types (seed):**
- Books: ["Author", "Publication Year", "Genre", "Description"]
- Long-form Videos: ["Creator/Channel", "URL", "Duration", "Platform", "Description"]
- Podcasts: ["Host", "Episode Number", "URL", "Duration", "Description"]
- Short-form Content: ["Creator", "Platform", "URL", "Description"]

*Note: Title is not part of `fields`. Always render Title as a top-level required input.*

**localStorage keys:**
- `kv_resource_types` → `ResourceType[]`
- `kv_resources` → `Resource[]`

## App Architecture

**`DataStoreProvider` (React Context):** central source of truth for resources and resourceTypes with localStorage persistence.

**Methods:**
- `getAllResources()`
- `createResource(partial: { typeId, title, metadata, transcript? }): Resource`
- `updateResource(id, updater: (r) => Resource)`
- `deleteResource(id)`
- `getResourceTypes()`
- `updateResourceTypes(updater: (types) => ResourceType[])`

**Behavior:**
- Loads from localStorage on mount; seeds defaults if missing
- Writes to localStorage on changes (immediate for MVP)

**Utilities:**
- `storage.ts` safe JSON read/write with try/catch
- `date.ts` helpers for formatting
- `resource.ts` helper: isTranscriptEnabled(typeId)

## Components (cohesive, self-contained)

- `NavBar`: top navigation with links to Home, Resources, Settings
- `PageHeader`: title + actions area
- `ResourceCard`: for list view items
- `FilterBar`: type chips/dropdown, search input, sort select
- `EmptyState`: reusable empty screen
- `ResourceTypePicker`: Step 1 on /resources/new
- `ResourceForm`: dynamic form that always shows Title + type fields from config; validate Title required; uses `react-hook-form`
- `MetadataSection`: display key/values; supports toggling to edit mode; Save/Cancel
- `MarkdownEditor`: wraps `@uiw/react-md-editor` with sensible defaults; height constrained; toolbar with headings, bold, italic, list
- `TranscriptEditor`: textarea; visible only for video/podcast
- `SaveBar`: sticky at bottom of notes section with Save button + unsaved indicator
- `KeyValueFieldList`: used in Settings for managing fields arrays
- `StatTiles` (optional): for dashboard quick stats

## Page Behaviors and Acceptance Criteria

### Resource Creation
- Title required; all other fields optional
- After submit, redirect to `/resource/[id]`
- New resource appears immediately on `/resources`

### Listing
- Filter by type; search by title substring; sort by title/created/updated
- State persists in URL query if easy; otherwise keep in component state

### Resource Page
- Metadata read-only by default; Edit toggles input mode for metadata fields and Title
- Notes editor loads existing notes; manual Save updates both local state and localStorage
- Unsaved changes indicator visible when editor content differs from persisted resource
- Transcript shows only if typeId is `video` or `podcast`

### Settings
- Show types and current fields
- Add new field (non-empty); remove field; persist to localStorage
- Creating new resources after changes uses updated forms
- Reset to defaults restores seed fields, does not delete existing resource data

### General
- All data persists across reloads
- Handle missing/non-existent resource IDs with a friendly "Not found" screen and a Back link

## Visual and UX Guidelines

- Typography-first; use Tailwind's `prose` for preview/read modes
- Generous line-height and spacing; avoid clutter
- Colors: grayscale with one accent color for CTAs
- Desktop layout: content centered, max-w-3xl; sections separated with subtle borders
- Make primary actions obvious: "Add New Resource", "Save Notes", "Edit Metadata", "Share" (disabled)
- Keyboard focus visible; accessible labels for form inputs

## File/Directory Structure

```
app/
├── layout.tsx (global layout, NavBar)
├── page.tsx (Home)
├── resources/
│   ├── page.tsx (Listing)
│   └── new/page.tsx (Create flow)
├── resource/[id]/page.tsx (Resource page)
├── settings/page.tsx (Settings)
└── login/page.tsx (placeholder)

components/
├── NavBar.tsx
├── PageHeader.tsx
├── ResourceCard.tsx
├── FilterBar.tsx
├── EmptyState.tsx
├── ResourceTypePicker.tsx
├── ResourceForm.tsx
├── MetadataSection.tsx
├── MarkdownEditor.tsx
├── TranscriptEditor.tsx
├── SaveBar.tsx
├── KeyValueFieldList.tsx
└── StatTiles.tsx (optional)

context/
└── DataStore.tsx

lib/
├── storage.ts
├── types.ts
├── date.ts
└── resource.ts

styles/
└── globals.css (Tailwind base, add prose styles)
```

## Minimal Code Contracts (to remove ambiguity)

**Interfaces:**
```ts
// lib/types.ts
export type ResourceTypeId = 'book' | 'video' | 'podcast' | 'short';

export interface ResourceType {
  id: ResourceTypeId;
  name: string;
  fields: string[];
}

export interface Resource {
  id: string;
  typeId: ResourceTypeId;
  title: string;
  metadata: Record<string, string>;
  notes: string;
  transcript?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```

**Storage utils:**
```ts
// lib/storage.ts
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
```

**Default types:**
```ts
// lib/resource.ts
import { ResourceType, ResourceTypeId } from './types';

export const DEFAULT_TYPES: ResourceType[] = [
  { id: 'book', name: 'Books', fields: ['Author', 'Publication Year', 'Genre', 'Description'] },
  { id: 'video', name: 'Long-form Videos', fields: ['Creator/Channel', 'URL', 'Duration', 'Platform', 'Description'] },
  { id: 'podcast', name: 'Podcasts', fields: ['Host', 'Episode Number', 'URL', 'Duration', 'Description'] },
  { id: 'short', name: 'Short-form Content', fields: ['Creator', 'Platform', 'URL', 'Description'] },
];

export function isTranscriptEnabled(typeId: ResourceTypeId): boolean {
  return typeId === 'video' || typeId === 'podcast';
}
```

**Context responsibilities** (no code necessary here, but enforce these behaviors):
- Seed `kv_resource_types` with `DEFAULT_TYPES` if missing
- Seed `kv_resources` as empty array
- On any create/update/delete, update `updatedAt` and persist
- Provide hooks for pages/components to access and mutate data

## Seed Mock Data (on first run)

Create 6–10 sample resources across types with plausible metadata and small example notes. Include at least:
- 2 Books, 2 Videos, 1 Podcast, 1 Short-form
- Include transcript content in 1 Video and 1 Podcast
- List the recent 5 on the Home page

## Non-Functional/Placeholders (for later phases)

- Share buttons (resource page and workspace) are present but disabled with tooltip "Coming soon"
- Login page is static placeholder; no magic-link auth yet
- No API calls, no database, no email sending

## Definition of Done (verify manually)

I can:
- Navigate Home → Resources → Settings and back
- Create resources of each type, including required Title
- See created resources on `/resources`, filter/search/sort them
- Open a resource, edit metadata, write notes, paste transcript (for video/podcast), and save
- Refresh the browser and see all data persisted
- Modify fields in Settings, create a new resource, and see new fields reflected
- See disabled "Share" actions and the placeholder Login page

**Technical requirements:**
- No runtime errors; TypeScript passes; ESLint clean (default)
- UI is clean, readable, desktop-focused; markdown preview looks great

## Quality Bar

- Clear, readable code: descriptive names, no deep nesting
- TypeScript strict where reasonable; avoid `any`
- Components small and composable; no unnecessary re-renders
- Tailwind classes organized; use `prose` for read/preview
- Empty, loading (if any), and error states are friendly

## Stretch (optional if trivial)

- Persist listing filters in URL query
- Debounced auto-save every 30s for notes with status text; manual Save remains

---

**Please implement all the above in a single working Next.js project so I can run `npm run dev` and start using it immediately. After scaffolding, include a short README with run instructions and feature overview.**
