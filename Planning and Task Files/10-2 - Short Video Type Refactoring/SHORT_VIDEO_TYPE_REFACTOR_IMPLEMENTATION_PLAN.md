# Short-Video Type Refactoring – Implementation Plan

## Overview & Strategy
- **Goal**: Promote short-form resources into a dedicated `short-video` type with platform filtering while restoring `video` to long-form-only semantics.
- **Approach**: Execute coordinated database, storage, and UI migrations to flatten metadata, update contracts, and deliver consistent experiences across Supabase and localStorage.
- **Guiding principles**: zero data loss, offline parity, type-safe contracts, and reversible migrations.

## Phases & Timeline
| Phase | Focus | Target Timeline |
|-------|-------|-----------------|
| 0 | Tooling & baselines | Day 0 |
| 1 | Supabase migrations | Day 0–1 |
| 1b | LocalStorage migration utility | Day 1 |
| 2 | Shared types & storage layer | Day 1–2 |
| 3 | Backend contract audit | Day 2 |
| 4 | Frontend/UI refactor | Day 2–3 |
| 5 | Styling integration | Day 3 |
| 6 | Testing & validation | Day 3–4 |
| 7 | Deployment & monitoring | Day 4 |

## Phase 0 – Preconditions & Tooling
1. **Repo hygiene**: Ensure working tree clean; stash or commit existing work.
2. **Type generation command**: Record command `npx supabase gen types typescript --linked > src/types/supabase-generated.ts` (or project-specific path) for later.
3. **Data snapshots**:
   - Supabase: Dump pre-migration data `npx supabase db dump --data-only --schema public --table resources --file backups/resources_pre_short_video.sql`.
   - LocalStorage: In dev console, export `localStorage['knowledge-vault-resources']` for verification.
4. **Migration template**: Confirm ability to run Supabase migrations locally (`npx supabase db reset` in safe environment).

## Phase 1 – Supabase Schema & Data Migration
Create three migration files under `supabase/migrations` with timestamps ordered sequentially.

### Migration 1 – Add `short-video` Enum Value
- **File**: `supabase/migrations/<timestamp>_add_short_video_type.sql`
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

### Migration 2 – Migrate Short-Form Data & Indexes
- **File**: `supabase/migrations/<timestamp>_migrate_short_video_data.sql`
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

### Migration 3 – Resource Type Config Seed
- **File**: `supabase/migrations/<timestamp>_add_short_video_config.sql`
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

## Phase 1b – LocalStorage Migration Utility
1. **File**: `scripts/migrations/migrateLocalShortVideos.ts` (new).
2. **Responsibilities**:
   - Read `knowledge-vault-resources` from localStorage.
   - For each resource with `type === 'video'` and `shortFormPlatform`, convert to `short-video`, flatten metadata, remove legacy keys.
   - Deduplicate hashtags, ensure numeric viewCount.
   - Persist updated array back to localStorage.
   - Log summary to console.
3. **Command**: Add `"migrate:local-short-videos": "tsx scripts/migrations/migrateLocalShortVideos.ts"` to `package.json` scripts.
4. **Execution**: Run automatically on app bootstrap (behind guard) or manual CLI per release instructions.

## Phase 2 – Shared Types & Storage Layer
### File Updates
1. `src/data/mockData.ts`
   - Extend `Resource['type']` union with `'short-video'`.
   - Remove `shortFormPlatform`/`shortFormMetadata`; add flat fields.
   - Update `resourceTypeConfig` to add `'short-video'` entry and remove `optionalShortFormFields`.
2. `src/data/storage.ts`
   - Update TypeScript imports and data manipulation to work with new flat structure.
   - Ensure initial mock data either migrates or excludes short-form records.
3. `src/data/storageAdapter.ts`
   - Update `StorageAdapter` interface, ensure `transformToDatabase` spreads flat metadata.
   - Guarantee local adapter uses migration utility or fallback check.
4. `src/data/supabaseStorage.ts`
   - Update `DatabaseResource`/`DatabaseResourceTypeConfig` unions.
   - Confirm metadata transformation respects flat structure.
5. `src/hooks/use-resources.ts` & any other hooks depending on type unions.
6. `src/types/shortFormApi.ts`
   - Align platform enums and update documentation comments referencing new flow.
7. Regenerate Supabase types (Phase 0 command) and update import paths.

### Additional Tasks
- Introduce helper type `type ShortVideoResource = Resource & { type: 'short-video' }` if useful for narrowing.
- Ensure storage layer handles partial updates without reintroducing nested keys.

## Phase 3 – Backend Contract Audit
1. `supabase/functions/short-form/handlers/process.ts`
   - Add comment clarifying frontend persists as `short-video`.
   - Review return payload metadata keys to ensure alignment with flattened fields (no rename necessary, but document expectation).
2. Search Supabase functions/scripts for hard-coded `type: 'video'` entries and update if they refer to short-form context.
3. If any triggers or cron jobs seed short-form content, update them accordingly.

## Phase 4 – Frontend & UI Updates
### Process Video Flow (`src/pages/ProcessVideo.tsx`)
- Change resource assembly to `type: 'short-video'`.
- Flatten metadata assignments (`platform`, `channelName`, `handle`, `viewCount`, `hashtags`, `extractedAt`, `extractionMethod`).
- Remove `creator` assignment for short videos; keep other fields intact.
- Update logging to mention short-video type.

### Resources Page (`src/pages/Resources.tsx`)
- Extend type filter options with `short-video`.
- Introduce `showPlatformFilter = selectedType === 'short-video'` guard.
- Update platform filter logic to check `resource.type === 'short-video' && resource.platform === selectedPlatform`.
- Update search to reference `channelName`, `handle`, `hashtags` flat fields.
- Derive platform counts via memo, using config-driven list if available.
- Ensure `useMemo` dependencies include `resources` and type filter state.

### Resource Card (`src/components/resources/ResourceCard.tsx`)
- Replace `shortFormPlatform` usage with `resource.platform` (guarded by type).
- Update creator view to use flat fields.
- Update view count and auto badge conditions.
- Apply `.knowledge-short-video` class for `short-video` resources.

### Resource Detail (`src/pages/ResourceDetail.tsx`)
- Add short-video section displaying platform, creator, views, hashtags, extraction info.
- Use shared helper (if created) to format view counts.

### Navigation & Entry Points
- Audit `Navigation.tsx`, `NewResource.tsx`, quick-add dialogs, and manual forms to ensure `short-video` type appears with correct icon/color.

### Duplicate Detection & Utilities
- `src/utils/resourceDuplicateLookup.ts`: Confirm no changes required; ensure new type doesn’t break logic.
- `src/hooks/use-resources.ts`: Update filters/selectors referencing type unions.

## Phase 5 – Styling Integration
1. `src/index.css`
   - Under `@layer components`, add:
     ```css
     @layer components {
       .knowledge-short-video {
         @apply bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700;
       }
       .badge-short-video {
         @apply bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700;
       }
     }
     ```
   - Ensure existing CSS structure supports `@layer components` usage.
2. `tailwind.config.ts`
   - Extend theme if necessary to include `knowledge-short-video` color token.
3. Component-specific classnames updated to use new utilities.

## Phase 6 – Testing & Validation
### Automated
- `npm run build`
- `npm run lint`
- Regenerate types and run TypeScript check if separate (`tsc --noEmit`).

### Database Validation
- After Migration 1: confirm enum values.
- After Migration 2: verify counts, absence of legacy keys, index creation.
- After Migration 3: ensure configs seeded.

### LocalStorage Validation
- Run `npm run migrate:local-short-videos` (if manual) and inspect result in DevTools.
- Confirm subsequent app loads use flat schema.

### Manual QA
1. Process new short video (YouTube Shorts) – verify type, metadata, badges.
2. Filter by `Short Videos`, change platform filters; ensure counts update.
3. View resource detail – confirm all sections display correctly.
4. Verify long-form `video` entries unaffected.
5. Search by channel name, handle, hashtag.
6. Duplicate detection with repeated short video URL.
7. Edit existing short-video, ensure metadata persists.
8. Offline scenario: run app unauthenticated, ensure local migration ran, create new short video manually.

### Regression Tests
- Smoke test other resource types (book, podcast, article) for creation, filtering, detail view.
- Ensure ProcessVideo still handles unsupported URLs gracefully.

## Phase 7 – Deployment & Monitoring
1. **Staging rollout**
   - Apply migrations, run QA checklist.
   - Monitor Supabase logs for enum errors or insert failures.
2. **Production plan**
   - Backup database (`npx supabase db dump`).
   - Apply migrations sequentially.
   - Deploy frontend changes.
   - Run localStorage migration guidance in release notes.
3. **Post-deploy**
   - Monitor metrics: number of `short-video` records, filter usage.
   - Watch for errors referencing missing enum values or fields.
   - Update documentation/CHANGELOG.

## Rollback Strategy
- **Database**: Use Supabase migration repair to mark migrations reverted in reverse order or restore from backup dump.
- **Frontend**: Revert to previous commit; ensure fallback still understands nested data (requires storing migration scripts to reapply if rolled forward).
- **LocalStorage**: Provide script to rehydrate from backup JSON captured in Phase 0.

## Deliverables Checklist
- [ ] Supabase migrations applied.
- [ ] LocalStorage migration script committed and documented.
- [ ] TypeScript resource contracts updated, no `shortForm*` references remain.
- [ ] Storage adapters regenerated Supabase types.
- [ ] Frontend components reflect new type behavior and styling.
- [ ] Tests/build/lint passing.
- [ ] QA checklist executed (including offline path).
- [ ] Deployment notes and rollback instructions drafted.


