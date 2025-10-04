# Short-Video Type Refactoring – Implementation Plan

## Overview & Strategy
- **Goal**: Promote short-form resources into a dedicated `short-video` type with platform filtering while restoring `video` to long-form-only semantics.
- **Approach**: Execute coordinated database, storage, and UI migrations to flatten metadata, update contracts, and deliver consistent experiences across Supabase and localStorage.
- **Guiding principles**: zero data loss, offline parity, type-safe contracts, and reversible migrations.

## Current Status (Updated 2025-01-02)
**MAJOR PROGRESS**: Most core functionality has been implemented and is operational.

### ✅ COMPLETED PHASES
- **Phase 0**: Tooling & baselines ✅
- **Phase 1**: Supabase migrations ✅ (All 3 migrations created and ready)
- **Phase 2**: Shared types & storage layer ✅ (TypeScript interfaces updated)
- **Phase 4**: Frontend/UI refactor ✅ (ProcessVideo, Resources, ResourceCard, ResourceDetail updated)
- **Phase 5**: Styling integration ✅ (CSS classes and Tailwind config updated)

### 🔄 IN PROGRESS / REMAINING
- **Phase 3**: Backend contract audit (Partial - Edge functions need review)
- **Phase 6**: Testing & validation (Needs execution)
- **Phase 7**: Deployment & monitoring (Pending)

## Phases & Timeline
| Phase | Focus | Status | Notes |
|-------|-------|--------|-------|
| 0 | Tooling & baselines | ✅ COMPLETED | Repo clean, migrations ready |
| 1 | Supabase migrations | ✅ COMPLETED | All 3 migrations created |
| 2 | Shared types & storage layer | ✅ COMPLETED | TypeScript interfaces updated |
| 3 | Backend contract audit | 🔄 PARTIAL | Edge functions need review |
| 4 | Frontend/UI refactor | ✅ COMPLETED | All major components updated |
| 5 | Styling integration | ✅ COMPLETED | CSS and Tailwind config updated |
| 6 | Testing & validation | ❌ PENDING | Needs execution |
| 7 | Deployment & monitoring | ❌ PENDING | Awaiting completion of remaining phases |

## Phase 0 – Preconditions & Tooling ✅ COMPLETED
1. **Repo hygiene**: ✅ Working tree clean, all changes committed to `refactor/storage-and-types-short-video-schema-migration` branch
2. **Type generation command**: ✅ Recorded as `npx supabase gen types typescript --linked > src/types/supabase-generated.ts`
3. **Data snapshots**: ✅ Ready for execution when migrations are applied
   - Supabase: `npx supabase db dump --data-only --schema public --table resources --file backups/resources_pre_short_video.sql`
   - LocalStorage: Export `localStorage['knowledge-vault-resources']` for verification
4. **Migration template**: ✅ Confirmed ability to run Supabase migrations locally

## Phase 1 – Supabase Schema & Data Migration ✅ COMPLETED
All three migration files have been created under `supabase/migrations` with proper timestamps.

### Migration 1 – Add `short-video` Enum Value ✅ COMPLETED
- **File**: `supabase/migrations/20251002000001_add_short_video_type.sql` ✅
- **Steps**:
  ```sql
  BEGIN;

  CREATE TYPE resource_type_new AS ENUM ('book','video','podcast','article','short-video');

  ALTER TABLE resources
    ALTER COLUMN type TYPE resource_type_new
    USING type::text::resource_type_new;

  ALTER TABLE resource_type_configs
    ALTER COLUMN resource_type TYPE resource_type_new
    USING resource_type::text::resource_type_new;

  DROP TYPE resource_type;
  ALTER TYPE resource_type_new RENAME TO resource_type;

  COMMENT ON TYPE resource_type IS 'Resource types: book, video (long-form), podcast, article, short-video (social).';

  COMMIT;
  ```
- **Validation query**: `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'resource_type'::regtype;`
- **Rollback**: Supabase migration repair or restore pre-dump.

### Migration 2 – Migrate Short-Form Data & Indexes ✅ COMPLETED
- **File**: `supabase/migrations/20251002000002_migrate_short_video_data.sql` ✅
- **Helper**: Define SQL function for clarity.
  ```sql
  CREATE OR REPLACE FUNCTION flatten_short_form_metadata(metadata jsonb)
  RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'platform', metadata->>'shortFormPlatform',
      'channelName', metadata->'shortFormMetadata'->>'channelName',
      'handle', metadata->'shortFormMetadata'->>'handle',
      'viewCount', (metadata->'shortFormMetadata'->>'viewCount')::int,
      'hashtags', metadata->'shortFormMetadata'->'hashtags',
      'extractedAt', metadata->'shortFormMetadata'->>'extractedAt',
      'extractionMethod', metadata->'shortFormMetadata'->>'extractionMethod',
      'creator', metadata->>'creator',
      'duration', metadata->>'duration',
      'url', metadata->>'url',
      'year', metadata->>'year'
    ));
  $$;
  ```
- **Migration body**:
  ```sql
  BEGIN;

  WITH to_migrate AS (
    SELECT id, flatten_short_form_metadata(metadata) AS meta
    FROM resources
    WHERE type = 'video'
      AND metadata->>'shortFormPlatform' IS NOT NULL
  )
  UPDATE resources r
  SET type = 'short-video',
      metadata = meta - 'creator' - 'duration' - 'url' - 'year' || jsonb_build_object(
        'platform', meta->>'platform',
        'channelName', meta->>'channelName',
        'handle', meta->>'handle',
        'viewCount', (meta->>'viewCount')::int,
        'hashtags', meta->'hashtags',
        'extractedAt', meta->>'extractedAt',
        'extractionMethod', meta->>'extractionMethod',
        'duration', meta->>'duration',
        'url', meta->>'url',
        'year', meta->>'year'
      )
  FROM to_migrate m
  WHERE r.id = m.id;

  UPDATE resources
  SET metadata = metadata - 'shortFormPlatform' - 'shortFormMetadata'
  WHERE metadata ? 'shortFormPlatform' OR metadata ? 'shortFormMetadata';

  CREATE INDEX IF NOT EXISTS idx_resources_short_video_platform
    ON resources ((metadata->>'platform'))
    WHERE type = 'short-video';

  DO $$
  DECLARE
    migrated_count integer;
    remaining_shortform integer;
  BEGIN
    SELECT COUNT(*) INTO migrated_count FROM resources WHERE type = 'short-video';
    SELECT COUNT(*) INTO remaining_shortform FROM resources WHERE type = 'video' AND (metadata ? 'shortFormPlatform' OR metadata ? 'shortFormMetadata');
    RAISE NOTICE 'Migrated % resources to short-video. Remaining legacy videos with short-form metadata: %', migrated_count, remaining_shortform;
  END;
  $$;

  COMMIT;
  ```
- **Validation**:
  - Count matches pre-migration inventory.
  - Ensure `remaining_shortform = 0`.

### Migration 3 – Resource Type Config Seed ✅ COMPLETED
- **File**: `supabase/migrations/20251002000003_add_short_video_config.sql` ✅
- **Steps**:
  ```sql
  BEGIN;

  INSERT INTO resource_type_configs (user_id, resource_type, config)
  SELECT DISTINCT user_id,
         'short-video'::resource_type,
         jsonb_build_object(
           'label','Short Videos',
           'icon','📱',
           'color','knowledge-short-video',
           'fields', jsonb_build_array('platform','creator','duration','url','channelName','handle','viewCount','hashtags')
         )
  FROM resource_type_configs
  WHERE user_id NOT IN (
    SELECT user_id
    FROM resource_type_configs
    WHERE resource_type = 'short-video'
  )
  ON CONFLICT (user_id, resource_type) DO NOTHING;

  CREATE OR REPLACE FUNCTION initialize_default_resource_type_configs(user_uuid uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    INSERT INTO resource_type_configs (user_id, resource_type, config) VALUES
      (user_uuid,'book','{"label":"Books","icon":"📚","color":"knowledge-book","fields":["author","year","isbn"]}'::jsonb),
      (user_uuid,'video','{"label":"Videos","icon":"🎬","color":"knowledge-video","fields":["creator","platform","duration","url"]}'::jsonb),
      (user_uuid,'short-video','{"label":"Short Videos","icon":"📱","color":"knowledge-short-video","fields":["platform","creator","duration","url","channelName","handle","viewCount","hashtags"]}'::jsonb),
      (user_uuid,'podcast','{"label":"Podcasts","icon":"🎧","color":"knowledge-podcast","fields":["creator","platform","duration","episode"]}'::jsonb),
      (user_uuid,'article','{"label":"Articles","icon":"📄","color":"knowledge-article","fields":["author","platform","readTime","url"]}'::jsonb)
    ON CONFLICT (user_id, resource_type) DO NOTHING;
  END;
  $$;

  COMMIT;
  ```
- **Validation**: `SELECT COUNT(*) FROM resource_type_configs WHERE resource_type='short-video';` matches distinct user count.


## Phase 2 – Shared Types & Storage Layer ✅ COMPLETED
### File Updates ✅ COMPLETED
1. `src/data/mockData.ts` ✅
   - ✅ Extended `Resource['type']` union with `'short-video'`
   - ✅ Added flat fields: `channelName`, `handle`, `viewCount`, `hashtags`, `extractedAt`, `extractionMethod`
   - ✅ Updated `resourceTypeConfig` to include `'short-video'` entry
2. `src/data/supabaseStorage.ts` ✅
   - ✅ Updated `DatabaseResource`/`DatabaseResourceTypeConfig` unions
   - ✅ Confirmed metadata transformation respects flat structure
3. `src/types/shortFormApi.ts` ✅
   - ✅ Platform enums aligned and documentation updated
4. `src/hooks/use-resources.ts` ✅
   - ✅ Updated to handle new type unions

### Additional Tasks ✅ COMPLETED
- ✅ Storage layer handles partial updates without reintroducing nested keys
- ✅ TypeScript contracts updated throughout codebase

## Phase 3 – Backend Contract Audit 🔄 PARTIAL
**STATUS**: Edge functions need review to ensure they align with new `short-video` type.

1. `supabase/functions/short-form/handlers/process.ts` 🔄 NEEDS REVIEW
   - ✅ Frontend already persists as `short-video` (see ProcessVideo.tsx line 422)
   - 🔄 Review return payload metadata keys to ensure alignment with flattened fields
   - 🔄 Add comments clarifying the new type flow
2. 🔄 Search Supabase functions/scripts for hard-coded `type: 'video'` entries and update if they refer to short-form context
3. 🔄 Check if any triggers or cron jobs seed short-form content, update them accordingly

**PRIORITY**: Medium - Edge functions are working but may need updates for consistency

## Phase 4 – Frontend & UI Updates ✅ COMPLETED
### Process Video Flow (`src/pages/ProcessVideo.tsx`) ✅ COMPLETED
- ✅ Changed resource assembly to `type: 'short-video'` (line 422)
- ✅ Flattened metadata assignments (`platform`, `channelName`, `handle`, `viewCount`, `hashtags`, `extractedAt`, `extractionMethod`)
- ✅ Updated logging to mention short-video type

### Resources Page (`src/pages/Resources.tsx`) ✅ COMPLETED
- ✅ Extended type filter options with `short-video`
- ✅ Added platform filter logic for `resource.type === 'short-video' && resource.platform === selectedPlatform`
- ✅ Updated search to reference `channelName`, `handle`, `hashtags` flat fields
- ✅ Added platform counts via memo (lines 106-112)
- ✅ Proper `useMemo` dependencies included

### Resource Card (`src/components/resources/ResourceCard.tsx`) ✅ COMPLETED
- ✅ Updated to use `resource.platform` for short-video resources
- ✅ Added platform display configuration (lines 25-29)
- ✅ Applied `.knowledge-short-video` class for `short-video` resources
- ✅ Updated creator view to use flat fields

### Resource Detail (`src/pages/ResourceDetail.tsx`) ✅ COMPLETED
- ✅ Added short-video specific fields to metadata form (lines 107-110)
- ✅ Updated form handling for new flat structure

### Navigation & Entry Points ✅ COMPLETED
- ✅ All components updated to handle `short-video` type with correct icon/color

### Duplicate Detection & Utilities ✅ COMPLETED
- ✅ `src/utils/resourceDuplicateLookup.ts`: No changes required, new type doesn't break logic
- ✅ `src/hooks/use-resources.ts`: Updated to handle new type unions

## Phase 5 – Styling Integration ✅ COMPLETED
1. `src/index.css` ✅ COMPLETED
   - ✅ Added `.knowledge-short-video` and `.badge-short-video` classes (lines 194-207)
   - ✅ Proper purple theme styling for short-video resources
   - ✅ Dark mode support included
2. `tailwind.config.ts` ✅ COMPLETED
   - ✅ Extended theme with `knowledge-short-video` color token
   - ✅ Platform-specific colors added (TikTok, YouTube, Instagram)
3. Component-specific classnames ✅ COMPLETED
   - ✅ All components updated to use new utilities

## Phase 6 – Testing & Validation ❌ PENDING
**STATUS**: Testing needs to be executed after migrations are applied.

### Automated ❌ PENDING
- `npm run build` - Needs execution
- `npm run lint` - Needs execution  
- Regenerate types and run TypeScript check if separate (`tsc --noEmit`)

### Database Validation ❌ PENDING
- After Migration 1: confirm enum values
- After Migration 2: verify counts, absence of legacy keys, index creation
- After Migration 3: ensure configs seeded

### LocalStorage Validation ❌ PENDING
- Note: LocalStorage migration script removed from scope
- Existing localStorage data will be handled by Supabase migrations only

### Manual QA ❌ PENDING
1. Process new short video (YouTube Shorts) – verify type, metadata, badges
2. Filter by `Short Videos`, change platform filters; ensure counts update
3. View resource detail – confirm all sections display correctly
4. Verify long-form `video` entries unaffected
5. Search by channel name, handle, hashtag
6. Duplicate detection with repeated short video URL
7. Edit existing short-video, ensure metadata persists
8. Offline scenario: run app unauthenticated, create new short video manually (no local migration needed)

### Regression Tests ❌ PENDING
- Smoke test other resource types (book, podcast, article) for creation, filtering, detail view
- Ensure ProcessVideo still handles unsupported URLs gracefully

**PRIORITY**: High - Must be completed before deployment

## Phase 7 – Deployment & Monitoring ❌ PENDING
**STATUS**: Awaiting completion of remaining phases.

1. **Staging rollout** ❌ PENDING
   - Apply migrations, run QA checklist
   - Monitor Supabase logs for enum errors or insert failures
2. **Production plan** ❌ PENDING
   - Backup database (`npx supabase db dump`)
   - Apply migrations sequentially
   - Deploy frontend changes
   - Run localStorage migration guidance in release notes
3. **Post-deploy** ❌ PENDING
   - Monitor metrics: number of `short-video` records, filter usage
   - Watch for errors referencing missing enum values or fields
   - Update documentation/CHANGELOG

**PRIORITY**: Low - Depends on completion of previous phases

## Rollback Strategy
- **Database**: Use Supabase migration repair to mark migrations reverted in reverse order or restore from backup dump.
- **Frontend**: Revert to previous commit; ensure fallback still understands nested data (requires storing migration scripts to reapply if rolled forward).
- **LocalStorage**: Provide script to rehydrate from backup JSON captured in Phase 0.

## Deliverables Checklist
- [x] Supabase migrations created (ready for application)
- [x] TypeScript resource contracts updated, no `shortForm*` references remain
- [x] Storage adapters updated for new type structure
- [x] Frontend components reflect new type behavior and styling
- [ ] Tests/build/lint passing ❌ **PENDING**
- [ ] QA checklist executed (including offline path) ❌ **PENDING**
- [ ] Deployment notes and rollback instructions drafted ❌ **PENDING**

## Next Steps Priority Order
1. **HIGH**: Execute testing and validation (Phase 6)
2. **MEDIUM**: Review and update edge functions (Phase 3)
3. **LOW**: Prepare deployment and monitoring (Phase 7)

## Summary
**Current State**: ~90% complete. Core functionality implemented, no major blockers remaining.
**Estimated Time to Completion**: 1 day for remaining tasks.


