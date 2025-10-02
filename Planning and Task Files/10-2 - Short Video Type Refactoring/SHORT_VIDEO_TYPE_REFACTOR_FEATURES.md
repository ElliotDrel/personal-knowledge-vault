# Short-Video Type Refactoring – Features & Functions Specification

## Vision
- Elevate short-form resources into a first-class `short-video` type that can evolve independently of long-form videos.
- Deliver platform-aware discovery so users can browse short videos by YouTube Shorts, TikTok, or Instagram Reels with clear visual cues.
- Flatten metadata across storage layers to simplify querying, analytics, UI rendering, and future automation.

## Scope
### In Scope
- Supabase schema updates introducing `short-video`, metadata migration, partial indexes, and user config seeding.
- Flattening legacy `shortFormMetadata` structures into top-level fields across Supabase, localStorage, and TypeScript contracts.
- Frontend updates spanning creation flows, resource listings, detail views, search, duplicate detection, and styling for the new type.
- LocalStorage migration script to normalize offline data.
- Regeneration of Supabase TypeScript types and storage adapters to honor the new schema.
- Documentation, testing, and monitoring around the short-video lifecycle.

### Out of Scope
- Supporting additional short-form platforms beyond YouTube Shorts, TikTok, Instagram Reels.
- New ingestion APIs or scheduled automation beyond existing edge function flows.
- Advanced analytics dashboards (can leverage flattened data later).
- Discriminated unions refactor (future enhancement once groundwork laid).

## Primary Objectives
1. **Clean Type Separation** – All current short-form entries move from `video` to a dedicated `short-video` type.
2. **Platform Subcategorization** – Platform filter appears whenever `short-video` is selected, with accurate counts.
3. **Metadata Flattening** – Replace nested `shortFormMetadata` with top-level fields (`platform`, `channelName`, `handle`, `viewCount`, `hashtags`, `extractedAt`, `extractionMethod`).
4. **Zero Data Loss** – Supabase and localStorage migrations preserve all metadata and successfully flip types.
5. **Restored Long-Form Video Type** – `video` resources contain only long-form fields with no short-form remnants.

## System Goals
- **Consistency** – Identical short-video shape across backend, adapters, frontend, and offline storage.
- **Extensibility** – New platforms or metadata slots can be introduced with minimal code churn.
- **Observability** – Operators can validate migrations, monitor adoption, and rollback safely.
- **Offline Parity** – LocalStorage users experience the same schema and features as Supabase-backed users.

## Target Data Model
```typescript
type ResourceType = 'book' | 'video' | 'podcast' | 'article' | 'short-video';

interface ShortVideoMetadata {
  platform?: 'youtube-short' | 'tiktok' | 'instagram-reel';
  channelName?: string;
  handle?: string;
  viewCount?: number;
  hashtags?: string[];
  extractedAt?: string;
  extractionMethod?: 'auto' | 'manual';
}

interface Resource extends ShortVideoMetadata {
  id: string;
  type: ResourceType;
  title: string;
  author?: string;
  creator?: string;
  platform?: string; // for long-form videos & other types
  year?: number;
  duration?: string;
  url?: string;
  description: string;
  notes: string;
  transcript?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Platform Taxonomy
- `youtube-short`
- `tiktok`
- `instagram-reel`

### Metadata Conventions
- Short-video fields populate only when `type === 'short-video'`.
- `creator` remains exclusive to long-form contexts; `channelName`/`handle` represent short-video attribution.
- `hashtags` stored as array of strings; duplicates cleaned during migration.
- `platform` values normalized to lowercase kebab-case for parity with detection utilities.

## UX Requirements
### Type Selection & Filtering
- `Short Videos` option appears in type filters on `Resources`, manual creation forms, quick add surfaces, and navigation shortcuts.
- Selecting `Short Videos` reveals a platform dropdown with counts derived from filtered collection.
- `All Platforms` default with options for YouTube Shorts, TikTok, Instagram Reels (counts update reactively).
- Filters collapse gracefully on mobile; selection persists in state.

### Resource Cards
- Purple accent border/background via `.knowledge-short-video` class.
- Platform badge using config metadata (icon + label).
- Creator line shows `channelName` or `@handle`; hides gracefully if unavailable.
- View count line uses shortened format (e.g., `12.5K views`, `1.2M views`).
- Auto-processed badge appears when `extractionMethod === 'auto'`.

### Resource Detail View
- Platform section with icon and friendly display name.
- Creator section displays `channelName` or `@handle` fallback.
- Views section uses formatted `viewCount` with accessible labels.
- Hashtags rendered as `Badge` components.
- Extraction info shows method and timestamp when available.

### Manual Creation & Editing
- Manual short-video creation defaults to `short-video`, requires platform, and allows optional metadata input.
- Edit flow preserves existing metadata and prevents reintroducing nested structures.

### Duplicate Detection
- `resourceDuplicateLookup` stays type-agnostic; duplicate messaging references the new type when applicable.

### Offline/LocalStorage Parity
- Local migration script flattens legacy nested metadata before UI renders resources.
- Subsequent inserts use flat schema; filters, counts, and search operate seamlessly offline.

## Backend & Integration Requirements
### Supabase
- `resource_type` enum gains `'short-video'` through create-copy-drop pattern inside transaction.
- Data migration flips eligible rows to `short-video`, flattens metadata via helper function, and removes legacy keys.
- Partial index `(metadata->>'platform')` scoped to `short-video` for platform filters.
- `resource_type_configs` seeded with `short-video` entry; initialization function updated accordingly.
- RLS policies and triggers reviewed for new enum value.

### Supabase Edge Function
- `process` handler documentation notes frontend saves as `short-video`.
- Audit for any hard-coded `type='video'` references; update logs/messages as needed.

### Storage Layer
- `storageAdapter`, `supabaseStorage`, `storage.ts`, `mockData`, and hooks updated to support new type and flattened metadata.
- Supabase-generated types regenerated to keep enums in sync.
- LocalStorage migration utility provided for offline normalization.

## Styling Guidelines
- Add `.knowledge-short-video` and `.badge-short-video` utilities within `@layer components` in `index.css`.
- Tailwind theme extends to include purple palette; ensure contrast passes in light/dark modes.
- Platform badges leverage existing iconography with purple accent.

## Accessibility & Performance
- Maintain WCAG AA contrast on new purple tones.
- Ensure filters and badges expose appropriate `aria-label` text.
- Partial index keeps platform filtering performant.
- UI avoids excessive re-renders by memoizing platform counts and derived data.

## Testing & Validation Targets
- `npm run build`, `npm run lint`, and any existing unit tests pass.
- SQL validation: migrated counts, absence of legacy keys, platform index creation.
- Manual QA covers automated and manual creation, filtering, search, detail view, duplicate detection, and offline parity.
- Regression testing ensures other resource types unaffected.

## Monitoring & Telemetry
- Migration steps log counts (`RAISE NOTICE`) for Supabase operators.
- Edge function logs note adoption of `short-video` type.
- Post-release monitoring checklist ensures filters, counts, and creation flows behave as expected.

## Future Enhancements
- Add new platforms by extending enums, configs, and detection logic with minimal refactor.
- Consider discriminated unions for resource types once the ecosystem is ready.
- Build analytics dashboards using flattened metadata (e.g., hashtag trends, platform usage).
- Explore automated tagging or AI summarization tuned to short-form content.


