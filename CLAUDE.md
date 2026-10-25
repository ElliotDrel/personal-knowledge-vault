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
   - [ ] For backend/Edge Function changes: Verified in production logs/database (not just build)
   - [ ] For prompt changes: User tested with actual AI call and confirmed behavior in logs
   - [ ] For duplication: Grepped for imports to verify both copies are actually used

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

23. **BACKEND CHANGES NEED PRODUCTION VERIFICATION** (NEW - Build Passing ≠ Feature Working): For backend/Edge Function changes, verify behavior in production logs/database, not just build success:
   - Prompt changes: Run actual AI call, check `ai_processing_logs` table for new structure
   - Config changes: Verify new fields are actually being sent (check `input_data` in logs)
   - Edge Function changes: Check Supabase Dashboard logs for actual behavior
   - Database changes: Query actual data, don't just trust migration ran
   - **Pre-deployment verification**: Provide SQL query user can run to confirm expected behavior
   - **Why**: Build passing only means "code compiles" - not "feature works as intended"

24. **ROOT CAUSE ANALYSIS BEFORE FIXES** (NEW - Prevents Symptom Whack-a-Mole): When a feature fails, analyze the actual failure case before proposing fixes:
   - Look at failed examples: What specifically went wrong?
   - Ask "what would have prevented this?"
   - Don't just fix symptoms - fix the underlying cause
   - **Example**: Duplicate suggestions meant Claude wasn't comparing to existing - fix was forcing explicit comparison FIRST
   - Update CLAUDE.md with the prevention pattern after learning
   - **Why**: Quick fixes often miss the root cause and failures repeat

25. **Syncing controlled editors:** Use a `useRef` to store the last value you sent to a controlled editor. On local edits, update both the ref and parent. When receiving new props, only overwrite editor state if the value doesn't match your ref. This prevents cursor jumps and editor resets from redundant updates.

26. **Third-party UI libraries:** Always read the docs, especially about required CSS, "Getting Started", and extension/plugin setup. Test a basic version of the component before adding features. Watch for non-standard state management patterns (e.g., controlled vs. uncontrolled) that differ from typical React forms.

27. **Inline error handling:** If a component performs an action (save, submit, delete), show error messages inside that component, near the action button. Keep the UI open so users can retry, and clear errors on new user input or success.

28. **Memoizing expensive configs:** Use `useMemo` for large config objects (like TipTap extensions, Monaco options, chart configs). Only recreate these when actual dependencies change, to avoid unnecessary reinitialization and performance issues.

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
2. **Run validation script** - Execute `psql -f validate-ai-migrations.sql` (repo root) to confirm schema, indexes, and RLS policies
3. **Run additional targeted queries if needed** - Use snippets from migration comments when digging into specific tables
4. **Query sample data** - Confirm data structure matches expectations
5. **Document findings** - State "Verified: X resources migrated, Y indexes created"

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

### AI Configuration (Single Source of Truth)

**AI configuration lives ONLY in the Edge Function**: `supabase/functions/ai-notes-check/config.ts`

This file contains:
- `SYSTEM_PROMPT`: Complete system prompt with goals, guidelines, comment rules, and JSON schema
- `AI_METADATA_CONFIG`: Which metadata fields to send to Claude per resource type
- `MAX_COMMENTS_PER_RUN`: Limit to prevent excessive API costs

**WHY NO FRONTEND CONFIG?**
- Frontend just calls the Edge Function with `resourceId` - it doesn't need prompts or config
- Edge Functions can't import from `src/`, so config must live in the function
- TypeScript types for AI responses live in `src/types/comments.ts` (shared between frontend and storage adapter)

**WORKFLOW**:
1. Edit `supabase/functions/ai-notes-check/config.ts` directly
2. Run `npm run deploy:edge` to deploy changes
3. No sync needed - there's only ONE config file!

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
| AI prompt/config changes not working | Edit `supabase/functions/ai-notes-check/config.ts` and redeploy with `npm run deploy:edge`. |
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
| Prompt changes deployed but not working | Check `ai_processing_logs.input_data->>'systemPrompt'` to verify new prompt is actually being sent. |
| AI generating duplicate suggestions | Put anti-duplication rules FIRST with visual emphasis; use domain-specific examples; force sequential workflow (list covered → propose new → filter). |
| Config files duplicated frontend+backend | Grep for imports (`rg "from.*filename"`) to verify both are used - delete if zero imports found. |
| Build passes but feature broken | For backend/Edge changes, verify in production logs/database - build only confirms code compiles. |

## Lessons Learned

### Core Habits
- Clarify requirements with concrete scenarios before choosing libraries or data models.
- Search the codebase before writing new utilities or components; reuse or update shared patterns across frontend and backend.
- Read official docs and regenerate types before coding, and confirm the schema design with the user before creating migrations.

### Implementation Discipline
- Keep React hooks ordered (`useState` -> data fetching -> memoization -> effects), wrap async work in `useCallback`, and initialize state where it lives.
- Test incrementally: after meaningful changes run `npm run build`/`npm run lint` and open the browser instead of batching fixes at the end. Never batch all testing to the end.
- For overlays or markdown, mirror styles with `getComputedStyle`, sync scroll positions, and transform the rendered AST (rehype) rather than splitting source text.
- For TipTap-based editors, track the last synced markdown in a ref and only call `setContent` when the upstream markdown actually changes; comparing raw HTML causes cursor resets.
- When styling ProseMirror placeholders, add the `@tiptap/extension-placeholder` extension (with matching `emptyEditorClass`) so the CSS selector is triggered.
- Surface save failures inside modal dialogs (e.g., inline alert state) so the user sees the error even while the dialog remains open.
- For third-party UI libraries (TipTap, Monaco, Leaflet), read docs for required CSS imports and extension architecture; test component in isolation before integration.
- When syncing bidirectional state (parent <-> child), use ref to track "last value I sent" to prevent feedback loops and cursor resets.
- Memoize expensive library configurations (TipTap extensions, chart options) with `useMemo` to prevent unnecessary re-initializations.
- Do root-cause analysis when something fails; do not patch symptoms without understanding them.

### Prompt & Backend Work
- Treat prompt text, runtime parsers, and shared TypeScript types as a single unit--ship updates together and replay a real request immediately.
- Use domain-specific examples and force sequential reasoning in prompts; verify results in `ai_processing_logs` before calling a change "done."
- Question duplication: grep for imports before keeping parallel configs or helpers, and delete dead code instead of letting it drift.
- Validate external integrations against official docs and production logs instead of assuming a passing build means success.

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




