# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY: Read This File FIRST

1. **READ THIS FILE FIRST**: Before making ANY assumptions, read this document. It contains lessons learned from past mistakes.

2. **CLARIFY REQUIREMENTS WITH EXAMPLES** (NEW - Prevents Wasted Work): When user describes desired behavior with terms like "Notion-style", "Obsidian-like", "WYSIWYG", etc., IMMEDIATELY ask 3-4 specific scenario questions with visual examples BEFORE choosing libraries or writing code. Ambiguous terms mean different things - clarifying first prevents implementing the wrong solution entirely.

3. **DOCUMENTATION-FIRST**: Always check official documentation for Supabase, Vercel, and complex libraries before coding. Use the **Context7 MCP** tools for library docs. For external libraries: check version/changelog for breaking changes, then test minimal example in isolation BEFORE full integration.

4. **SEARCH-FIRST PATTERN (Prevents 90% of Integration Bugs)**: Before creating ANY utility function OR component, search for existing ones first: `rg "normalize" --type ts` or `rg "useMutation" --type tsx` or `rg "Progress" --type tsx`. Reuse existing patterns (functions, hooks, components, styling patterns). Update ALL occurrences in both `src/` and `supabase/functions/` simultaneously. **This applies to**: utilities, components, hooks, type definitions, and UI patterns.

5. **Use Storage Adapter Only**: Always `import { useStorageAdapter } from '@/data/storageAdapter'`. Never import `storage.ts` or `supabaseStorage.ts` directly.

6. **Security at Query Level**: Add `.eq('user_id', user.id)` to Supabase queries BEFORE `.single()`. Never fetch first then check permission (timing attack vulnerability).

7. **No Placeholders**: Before claiming "complete", ensure: real endpoints, passes `npm run lint` + `npm run build`, end-to-end test works.

8. **Cross-Reference Before Complete** (CRITICAL - Prevents Missing Requirements): Before marking ANY task complete, explicitly check ALL relevant patterns in this file. Create checklist: Search-First ✓, Cascading Fallbacks ✓, Security ✓, **Type Verification** ✓, **Hook Ordering** ✓, etc. Missing this step causes bugs that code review finds later.

   **Mandatory Pre-Completion Checklist**:
   - [ ] Verified actual TypeScript types match implementation (not just plan docs)
   - [ ] Checked hook ordering: useState → useQuery → useCallback/useMemo → useEffect
   - [ ] Any async function used in useEffect is wrapped in useCallback
   - [ ] State initialized where it's owned (not lazily by child components)
   - [ ] For textarea overlays: Used `getComputedStyle()` mirroring + scroll sync + transparent text
   - [ ] For markdown processing: Used rehype plugin (not source splitting)
   - [ ] For multi-element components: Provided granular className props
   - [ ] Tested in browser after each integration point (not just at end)
   - [ ] `npm run build` passes
   - [ ] `npm run lint` passes

9. **Clarify Before Destructive Changes**: When user says "disable it", "remove it", or "change it" in context of discussing multiple features, ALWAYS ask which one. Never assume. Communication mistakes are harder to fix than code mistakes.

10. **Incremental Testing**: After EACH significant change, run `npm run build` and test in browser.

11. **Mirror Target Styles for Overlays (NEW)**: For highlight overlays, ghost inputs, or mirror divs, read `getComputedStyle` from the real control, apply font/line-height/padding/border radius/box sizing to the overlay, and sync scroll offsets. Always set overlay text color to transparent so only the background shows. Never rely on Tailwind class duplication—drifted highlights mean you skipped this rule.

12. **Systematic Refactoring** (NEW): When removing state variables, functions, or props: use IDE "Find All References" + search string literals (`rg "isEditingNotes"`), update ALL references, then test immediately to catch "undefined" errors.

13. **CLARIFY DATA MODELS BEFORE SCHEMA** (NEW - Prevents Major Rework): When implementing database tables with relationships (comments/replies, threads, hierarchies), ALWAYS ask specific questions about the data model BEFORE creating migrations:
   - "Should this be separate tables or a self-referential table?"
   - "Should child items be the same type or different type as parent?"
   - "How should threading/nesting work? Foreign keys or linked list?"
   - **Why**: Choosing wrong model requires refactoring migrations, types, storage adapter, AND components. Asking 2 questions upfront saves 2+ hours of rework.

14. **WATCH GENERATED TYPES AFTER MIGRATIONS** (NEW): After running `npx supabase gen types typescript --linked`, ALWAYS read the generated types to verify they match your implementation. If user modified migrations, the generated types will show fields you may have missed (e.g., `thread_root_id`, `body`). Proactively update implementation to match schema.

15. **STABILIZE CALLBACK PROPS** (NEW): When parent callbacks are optional or likely to re-create on every render, mirror them into a `useRef` and read from the ref inside memoized callbacks/effects. This keeps dependency arrays minimal while always using the latest handler.
16. **FLUSH DEBOUNCED WORK ON EXIT** (NEW): Whenever debouncing persistence (e.g., `useDebouncedCallback`), expose a flush helper. Await it before saves/closures and trigger it in effect cleanup. Log flush errors so dropped updates never fail silently.

17. **VERIFY EXTERNAL API DETAILS FIRST** (NEW - Prevents Integration Failures): Before implementing ANY external API integration (Anthropic, OpenAI, Stripe, etc.), VERIFY against official documentation:
   - Exact model names/endpoint URLs (don't assume formats)
   - Authentication method and header format
   - Request/response structure and data types
   - Rate limits and error codes
   - **Example**: For Anthropic, check docs.anthropic.com/models for exact model IDs before writing config
   - **Why**: Assumptions about API details cause 404s, 400s, and authentication failures that waste debugging time

18. **DEFENSIVE API RESPONSE PARSING** (NEW - Handles AI Output Variability): AI models (Claude, GPT, etc.) may return JSON wrapped in markdown code fences or other formatting. Always parse defensively:
   - Strip markdown fences before JSON.parse: `text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')`
   - Validate response structure after parsing
   - Log both raw and cleaned responses for debugging
   - **Why**: AI outputs are non-deterministic; one run succeeds, next run wraps in markdown

19. **PURPOSE-DRIVEN DATA DESIGN** (NEW - Prevents Table Pollution): Before adding ANY field to a database table, ask "What is this table's PURPOSE?" Only include data that serves that specific purpose.
   - **Example**: `ai_processing_logs` is for troubleshooting AI interactions → only save data going TO or FROM the AI
   - Don't add analytics data (resource type, title) to debugging tables
   - Don't add debugging data to business logic tables
   - **Why**: Mixed-purpose tables become confusing and hard to query

20. **NEVER TRUNCATE SOURCE MATERIAL** (NEW - Preserves Analysis Quality): When sending data to AI for analysis, NEVER truncate the source material (transcripts, documents, descriptions). Truncate metadata summaries if needed, but preserve complete source content.
   - **Example**: Full transcript (1000+ chars) → keep all, Description summary → can truncate
   - **Why**: AI needs complete source material to identify missing concepts and give quality suggestions

### Supabase CLI-Only Workflow

**CRITICAL RULE**: This project uses the Supabase CLI **EXCLUSIVELY** against the deployed Supabase project. **NO local Docker setup.**

**Common Commands**:
- `npx supabase db push` - Deploy local migrations/config to remote
- `npx supabase db pull` - Pull remote schema changes locally
- `npx supabase functions deploy <name>` - Deploy Edge Function
- `npx supabase secrets list` - View secrets (digests only)
- `npx supabase secrets set KEY=value` - Set API key

**Rules**:
1. All settings (`auth`, `db`, etc.) managed in `supabase/config.toml`
2. **NEVER** use `supabase start`, `supabase functions serve`, or Docker containers
3. Never commit secrets - use Supabase secrets for API keys like `YOUTUBE_API_KEY`
4. Never use `VITE_` prefix for server-side secrets (exposes to browser)

### Edge Function Development & Testing

**DEPLOY-FIRST WORKFLOW** (Not local-first):
1. Make code changes to Edge Functions
2. **Deploy immediately**: `npx supabase functions deploy <name>`
3. Test via the running app against deployed function
4. View logs in Supabase Dashboard (Functions → Logs tab)
5. Iterate: fix → deploy → test

**Critical Points**:
- **NO CLI logs command**: `npx supabase functions logs` doesn't exist. Use Dashboard only.
- **Library compatibility**: Not all npm packages work in Deno/Edge Runtime. Check documentation before full implementation.

### Database Migration Best Practices

*   **CRITICAL: Use ASCII-only in SQL files**. Unicode characters (e.g., emojis ✅⚠️) in migrations WILL cause deployment failures.
*   Use modern PostgreSQL functions: `gen_random_uuid()` instead of `uuid_generate_v4()`.
*   Handle Unicode/emojis carefully in your application code when storing them in JSONB.
*   Never delete old migration files.

### Post-Migration Validation (MANDATORY)

After running `npx supabase db push`, ALWAYS verify migrations succeeded:

1. **Check NOTICE logs** - Migration output shows counts/warnings
2. **If needed run validation queries and verify indexes created** - Use queries from migration comments:
3. **Query sample data** - Confirm data structure matches expectations
4. **Document findings** - State "Verified: X resources migrated, Y indexes created"

**CRITICAL**: NOTICE logs show execution, not correctness. Always query actual data.

### Commands

*   `npm run dev`: Start dev server on port 2222.
*   `npm run build`: Build for production.
*   `npm run lint`: Check code quality.
*   `npm install`: Install dependencies.

## Architecture Quick Reference

**Tech Stack**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase


## Testing Checklist (MANDATORY After Changes)

**Build & Quality**: `npm run build` + `npm run lint` pass, `npm run dev` starts

**End-to-End**: Navigate all routes → create resource → verify navigation/auth/loading/errors

**Full-Stack**:
- Search shared logic in BOTH `src/` + `supabase/functions/` → update ALL occurrences
- Check type conditionals include ALL relevant types (`type === 'video' || type === 'short-video'`)
- Test flow: Backend → DB → API → Frontend → UI
- Deploy both: frontend (auto) + backend (`npx supabase functions deploy <name>`)
- Verify logs + DB values on both sides

## Critical Code Patterns

### Configuration File Synchronization (MANDATORY)

**SYNC WARNING**: The following configuration files are DUPLICATED between frontend and Edge Function and MUST be manually synchronized:

| Source of Truth (Edit This) | Must Sync To (Don't Edit Directly) | Deployment Command |
|------------------------------|-------------------------------------|-------------------|
| `src/config/aiConfig.ts` | `supabase/functions/ai-notes-check/config.ts` | `npm run deploy:edge` |

**WHY**: Edge Functions run in Deno and cannot import from the `src/` directory. The config must be duplicated.

**WORKFLOW**:
1. Edit `src/config/aiConfig.ts` (frontend source of truth)
2. Manually copy `AI_CONFIG` changes to Edge Function config
3. Run `npm run deploy:edge` - automated sync check will verify before deploying
4. If sync check fails, deployment is blocked until configs match

**AUTOMATED PROTECTION**: The `check-sync` script compares both files and blocks deployment if they differ. You'll see:
```
❌ SYNC ERROR: Config files are out of sync!
   Source of truth: src/config/aiConfig.ts
   Out of sync:     supabase/functions/ai-notes-check/config.ts
```

**FUTURE IMPROVEMENT**: Consider implementing database-backed config (see Options discussion in git history) or build-time sync script for zero-duplication solution.

---

### React Hooks Order & Dependencies
**Hook Execution Order** (CRITICAL - violating causes "Cannot access before initialization"):
1. All `useState` declarations
2. All `useQuery`/`useMutation` calls
3. All `useCallback`/`useMemo` hooks (that create functions/values)
4. **Derived state** (computed from above)
5. All `useEffect` hooks (always last)

**CRITICAL RULE**: Define `useCallback` BEFORE any `useEffect` that uses it. Example:
```typescript
// ✅ CORRECT: useCallback before useEffect
const loadData = useCallback(async () => { ... }, [dep1, dep2]);
useEffect(() => { loadData(); }, [loadData]);

// ❌ WRONG: useEffect before useCallback (causes "Cannot access before initialization")
useEffect(() => { loadData(); }, [loadData]);
const loadData = useCallback(async () => { ... }, [dep1, dep2]);
```

**Callback Stability** (CRITICAL - violating causes infinite loops):
- **NEVER pass inline callbacks to custom hooks** → creates re-render cascade
- Inline functions = new reference every render → all dependencies update → re-render loop
Prefer returning values from hooks and reacting in components. If a callback is unavoidable, stabilize it with `useCallback`.

### React Query: Pure queryFn & Reliable State
Keep `queryFn` pure - **never** call `setLoading(false)` or `setState()` inside it (breaks retry/refetch). Use `onSuccess`/`onError`/`onSettled` for side effects. For critical state flags, use effects that watch `query.isFetched` instead of relying on callbacks (caching/strict mode can prevent callbacks from firing).

### Data Hierarchy: Cascading Ternary
Display exactly one creator field: `channelName` → `handle` → `author` → `creator` (prevents duplicate names).

### Type Safety: Discriminated Unions
For mutually exclusive params: `| { jobId: string; normalizedUrl?: never } | { normalizedUrl: string; jobId?: never }` (catches invalid combinations at build-time).

**Type Verification Before Implementation**:
```typescript
// ❌ WRONG: Implementing based on plan docs without checking types
await storageAdapter.createComment({
  initialReplyText: text, // Plan said this, but type expects 'body'!
});

// ✅ CORRECT: Check actual type definition first
// 1. Read CreateCommentInput type definition
// 2. See it expects 'body: string'
// 3. Implement correctly:
await storageAdapter.createComment({
  body: text,
});
```

### Async State Management
All data operations need `loading`/`error` state: `setLoading(true)` → `try/catch/finally` → `setLoading(false)` in `finally`.

### Switch Statement Block Scope
Wrap each case in `{ }` to scope `const` declarations: `case 'video': { const metadata = ...; }` (prevents conflicts).

### Data Modeling: Parent-Child & Types

- Use a single, self-referential table for parent/child data when entities are the same (e.g., comments & replies), recursion/nesting is needed, or CRUD is unified.
- Use separate tables only when child differs in structure or permissions.
- Avoid duplicate tables/types for the same structure—prefer a discriminator field.
- In TypeScript, use discriminated unions for shared fields; avoid copy-paste types named differently for identical data.

## Common Issues

| Issue | Fix |
|-------|-----|
| Config drift between app and Edge Function | Mirror changes from `src/config/aiConfig.ts` into the Edge config and redeploy with `npm run deploy:edge`. |
| "Cannot access before initialization" | Declare `useCallback` before the `useEffect` that depends on it and keep the documented hook order. |
| Infinite re-render loops | Wrap async effect logic in `useCallback`, reference it inside `useEffect`, and audit dependency arrays. |
| Loading flags never flip | Read React Query state via `useEffect` watching `query.isFetched` or `query.status` instead of relying on `onSettled`. |
| Runtime type mismatches | Inspect the actual TypeScript definitions before implementing; align inputs and outputs exactly. |
| Duplicate detection misses | Normalize both stored and incoming URLs with the shared `normalizeUrl()` helper before comparison. |
| Missing tables after migrations | Run `npx supabase db push` and confirm the schema in Supabase. |
| Edge or external API 404s | Verify model IDs and endpoints against official docs before deployment. |
| AI JSON parsing failures | Strip markdown code fences and guard JSON parsing with try/catch plus logging. |
| New fields not persisting | Update every CRUD path (create/read/update/delete) and regenerate types whenever a schema field is added. |
| Background polling noise | Hard refresh the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) after Supabase config changes. |
| React Query side effects | Keep `queryFn` pure; move side effects into `onSuccess` or `useEffect`. |
| Missing useCallback deps | Wrap the function first, then include every captured value in the dependency array. |
| Textarea overlay misaligned | Mirror `getComputedStyle`, sync scroll offsets, and render text transparent. |
| Markdown highlighting breaks syntax | Modify the rendered markdown AST with a rehype plugin instead of splitting source text. |
| Component styling inflexible | Expose container/input className props so callers can match layout needs. |
| AI suggestions degrade | Confirm transcripts and descriptions stay intact; never reapply truncation helpers. |
| Table data pollution | Revalidate the table's purpose before adding fields and update migrations plus types. |

## Lessons Learned

### Comments System Implementation (2025-10-10)
**Key Mistakes**:
1. **Wrong Data Model**: Created separate `comment_replies` table instead of self-referential `comments` table with threading fields
2. **Missing Fields**: Didn't include `body` field for comment text
3. **Ignored Generated Types**: Didn't read generated types after migrations to sync implementation
4. **Overcomplicated Types**: Created separate `CommentReply` type instead of using discriminator field
5. **Boundary Condition Bug**: Left `changeStart <= startOffset` in offset recalculation, so edits at the anchor boundary shifted the highlight instead of expanding it.

**Key Takeaway**: **Data model clarity is MORE critical than algorithm optimization**. Ask about threading model BEFORE creating schema. After porting algorithms, explicitly test boundary cases (≤, ≥, equal) to avoid regressions like offset shifting.

### Markdown Editor Refactor (2025-10-10)
**Key Mistakes**:
1. **Requirements Misunderstanding**: Implemented Novel (WYSIWYG) when user wanted Obsidian-style toggle
2. **Library API Misuse**: Used empty `extensions={[]}` causing "Schema missing top node type" error
3. **No Incremental Testing**: Made multiple changes before testing
4. **API Changes**: Used deprecated `className` prop in react-markdown v10+
5. **Leftover Code**: Removed state but forgot to remove all references

**Key Takeaway**: **Clarification BEFORE coding prevents wasted work**. One minute asking questions saves hours implementing wrong solution.

### Comments Integration (Phases 4-7, 2025-10-11)
**Key Mistakes**:
1. **Hook Ordering Violation**: Put useEffect before useCallback, causing "Cannot access before initialization" even though CLAUDE.md documented this pattern
2. **Type Mismatch**: Passed `initialReplyText` instead of `body` by following plan docs without verifying actual TypeScript types
3. **State Ownership**: Added `commentCount` state to ResourceDetail but initialized it from child component's callback, causing badge to show nothing until dialog opened
4. **useCallback Inconsistency**: Used useCallback for `loadComments` but not `loadResolvedComments`, inconsistent pattern application

**Key Takeaway**: **Having patterns documented isn't enough—need enforcement via pre-completion checklist**. Before marking ANY task complete:
- ✓ Verify hook order: useState → useQuery → useCallback → useEffect
- ✓ Check actual types match (not just plan assumptions)
- ✓ Verify state initialized where owned (not by children)
- ✓ Ensure async functions in useEffect are useCallback-wrapped
- ✓ Run `npm run build` + `npm run lint`

### Visual Highlighting Implementation (Phase 8, 2025-10-14)
**Key Mistakes**:
1. **Incomplete CSS Overlay**: Created TextHighlight without `getComputedStyle()` mirroring, scroll sync, or transparent text color - user had to add these after
2. **Wrong Markdown Approach**: Split markdown source into segments and rendered each separately, breaking syntax across boundaries (e.g., splitting `**bo|ld**`)
3. **Inflexible Component API**: Provided only one `className` prop when MarkdownField has both container and textarea elements - user added `textareaClassName`
4. **No Incremental Testing**: Built all components and wired them up before testing in browser - user caught CSS issues after the fact

**Root Causes**:
- Didn't think through textarea overlay requirements (exact font/padding/spacing synchronization)
- Didn't understand markdown parsers deeply (need to transform OUTPUT, not INPUT)
- Didn't follow shadcn/ui pattern of multiple className props for complex components
- Skipped browser testing until the end instead of testing each integration point

**Key Takeaway**: **Test integration points immediately, not after all wiring is complete**. For components requiring precise CSS synchronization or DOM structure:
1. Implement complete version with all CSS synchronization (not minimal MVP)
2. Integrate into parent component
3. **Test in browser immediately** - don't wait for build/lint
4. For textarea overlays: ALWAYS use `getComputedStyle()` + scroll sync + transparent text
5. For markdown processing: Transform the rendered AST (rehype plugin), never split source text
6. For multi-element components: Provide granular className props from the start

### AI Notes Check System Implementation (2025-10-17)
**Key Mistakes**:
1. **Model ID Assumption**: Picked `claude-4-5-haiku` instead of the documented `claude-haiku-4-5-20251001`.
2. **Markdown JSON Handling**: Parser failed because the API wrapped JSON in markdown code fences; no defensive stripping.
3. **Transcript Truncation**: Reused a 500-character truncation helper that removed analysis context.
4. **CRUD Drift**: Added `input_data` but skipped the UPDATE path, leaving logs incomplete.
5. **Table Scope Creep**: Added analytics fields to `ai_processing_logs`, obscuring troubleshooting data.

**Root Causes**:
- Trusted assumptions instead of official docs for model names and response formats.
- Copy-pasted helpers without checking whether source material must remain intact.
- Touched schema without auditing every CRUD path or reaffirming the table's purpose.

**Key Takeaway**: Verify external API contracts before coding, preserve full source material, and confirm table intent plus CRUD coverage whenever the schema changes; otherwise you trade hours fixing avoidable drift.

### Key Patterns
- **Schema & Types**: Clarify relationships before migrations, treat generated types as the source of truth, and prefer discriminated unions or self-referential tables when data shapes match.
- **Hooks Discipline**: Keep hooks ordered (useState -> useQuery -> useCallback/useMemo -> derived state -> useEffect), wrap async logic in useCallback, and initialize state where it is owned.
- **Search-First Consistency**: Update shared logic across frontend and backend together and expose flexible component APIs (multiple className props) instead of duplicating patterns.
- **UI Precision**: Mirror getComputedStyle for overlays, operate on the rendered markdown AST via rehype plugins, and test each integration point in the browser immediately.
- **External Integrations**: Verify model IDs/endpoints with official docs, strip markdown fences before parsing AI JSON, and preserve full source material for analysis.
- **Purpose-Driven Data**: Confirm each schema field serves the table intent and run the pre-completion checklist before marking work done.

## Project Status (Updated 2025-10-17)

**Latest Update (2025-10-17) - AI Notes Check System**:
- Phases 0-4 shipped: RLS-backed logging schema, shared config modules, Edge Function pipeline with defensive Anthropic integration, storage adapter APIs, and editor surface via `AINotesCheckTool`.
- Phase 7 hardening: corrected model identifier, stripped markdown fences before JSON parsing, removed transcript truncation, ensured `input_data` persists, and expanded metadata sync.
- Current focus: finish end-to-end validation, wire retry/error telemetry, and document handoff criteria before production flag.

**Earlier Highlights**:
- 2025-10-11 - Notes Commenting System: self-referential schema with offset tracking, storage adapter CRUD, NotesEditorDialog integration, resolution modal, badges, and highlight overlays; Phase 9-10 polish/testing still pending.
- 2025-10-11 - Markdown Editor Upgrade: Obsidian-style toggle using react-markdown + remark-gfm + rehype-sanitize, bundle shrink, and GitHub-flavored markdown styling via Tailwind Typography.

**Core Features**:
- ✅ React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- ✅ Supabase authentication & storage (no localStorage)
- ✅ YouTube Shorts/Videos: Metadata extraction, transcript extraction (English → auto-language fallback)
- ✅ Short-Video type: First-class type with flat metadata, purple theme, platform filtering
- ✅ URL Processing: Dashboard input, auto-processing, duplicate detection
- ✅ Multiple jobs per URL supported (cache removed)
- ✅ Comments System: Full end-to-end commenting (Phases 0-5 complete)
  - Create text-anchored comments with selection
  - Thread replies within comments
  - Automatic offset tracking and stale detection
  - Comment resolution workflow

**Known Limitations**:
- ⏳ TikTok/Instagram transcript extraction not yet implemented
- ⏳ No automatic cleanup of old processing jobs

## Vercel Deployment

- **Production**: https://personal-knowledge-vault.vercel.app/
- **Auto-deploy**: `main` branch → production, PRs → preview
- **Environment Variables**: Manage in Vercel dashboard (never commit `.env`)
- **Deployment Checklist**:
  1. Run `npm run build` locally
  2. Verify no unexpected chunk splits in `dist/assets/*.js`
  3. Check production URL and Vercel logs after deploy
  
---

**Remember**: Search-first, security-first, test end-to-end, no placeholders.
