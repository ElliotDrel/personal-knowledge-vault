# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY: Read This File FIRST

1. **READ THIS FILE FIRST**: Before making ANY assumptions, read this document. It contains lessons learned from past mistakes.

2. **CLARIFY REQUIREMENTS WITH EXAMPLES** (NEW - Prevents Wasted Work): When user describes desired behavior with terms like "Notion-style", "Obsidian-like", "WYSIWYG", etc., IMMEDIATELY ask 3-4 specific scenario questions with visual examples BEFORE choosing libraries or writing code. Ambiguous terms mean different things - clarifying first prevents implementing the wrong solution entirely.

3. **DOCUMENTATION-FIRST**: Always check official documentation for Supabase, Vercel, and complex libraries before coding. Use the **Context7 MCP** tools for library docs. For external libraries: check version/changelog for breaking changes, then test minimal example in isolation BEFORE full integration.

4. **SEARCH-FIRST PATTERN (Prevents 90% of Integration Bugs)**: Before creating ANY utility function, search for existing ones first: `rg "normalize" --type ts` or `rg "function.*Url" --type ts`. Reuse existing functions (especially `normalizeUrl`, `detectPlatform`) to ensure consistency. Update ALL occurrences in both `src/` and `supabase/functions/` simultaneously.

5. **Use Storage Adapter Only**: Always `import { useStorageAdapter } from '@/data/storageAdapter'`. Never import `storage.ts` or `supabaseStorage.ts` directly.

6. **Security at Query Level**: Add `.eq('user_id', user.id)` to Supabase queries BEFORE `.single()`. Never fetch first then check permission (timing attack vulnerability).

7. **No Placeholders**: Before claiming "complete", ensure: real endpoints, passes `npm run lint` + `npm run build`, end-to-end test works.

8. **Cross-Reference Before Complete** (CRITICAL - Prevents Missing Requirements): Before marking ANY task complete, explicitly check ALL relevant patterns in this file. Create checklist: Search-First ✓, Cascading Fallbacks ✓, Security ✓, etc. Missing this step causes bugs that code review finds later.

9. **Clarify Before Destructive Changes**: When user says "disable it", "remove it", or "change it" in context of discussing multiple features, ALWAYS ask which one. Never assume. Communication mistakes are harder to fix than code mistakes.

10. **Incremental Testing** (NEW): After EACH significant change (new component, integration, refactor), run `npm run build` and test in browser. Don't batch multiple changes before testing. Errors are easier to isolate when you test after each step.

11. **Systematic Refactoring** (NEW): When removing state variables, functions, or props: use IDE "Find All References" + search string literals (`rg "isEditingNotes"`), update ALL references, then test immediately to catch "undefined" errors.

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

### React Hooks Order & Dependencies
**Hook Execution Order** (CRITICAL - violating causes "Cannot access before initialization"):
1. All `useState` declarations
2. All `useQuery`/`useMutation` calls
3. **Derived state** (computed from above)
4. All `useEffect`/`useCallback`/`useMemo` hooks

Avoid referencing derived state (e.g., flags from queries/mutations) before it is declared. Define derived state first, then reference it in effects.

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

### Async State Management
All data operations need `loading`/`error` state: `setLoading(true)` → `try/catch/finally` → `setLoading(false)` in `finally`.

### Switch Statement Block Scope
Wrap each case in `{ }` to scope `const` declarations: `case 'video': { const metadata = ...; }` (prevents conflicts).

## Common Issues

| Issue | Solution |
|-------|----------|
| **"Cannot access before initialization"** | Define derived state BEFORE useEffect that uses it |
| **Infinite re-render loop** | Remove inline callbacks from custom hooks OR wrap in useCallback |
| **State flag never sets (query.onSettled)** | Set state in useEffect with query.isFetched dependency instead |
| **URL comparison fails (duplicate detection)** | Use same `normalizeUrl()` function for both sides of comparison |
| **404 Table Not Found** | Run `npx supabase db push` to deploy migrations |
| **Frontend/Backend Mismatch** | Search-first: `rg "normalizeUrl" --type ts` → update ALL files |
| **Hooks Order Error** | Move all `useEffect` to END after useState/useQuery/derived-state |
| **Background Polling Noise** | Hard refresh: `Ctrl+Shift+R` (Win) / `Cmd+Shift+R` (Mac) |
| **React Query Side Effects** | Never set state in `queryFn`; use effects with query.isFetched |

## Lessons Learned

### Most Recent: Markdown Editor Refactor (2025-10-10)
1. **Requirements Misunderstanding** (MOST CRITICAL): User said "Obsidian-style" → I jumped to implementing Novel (live WYSIWYG) without clarifying
   - **What I should have done**: Ask 4 specific scenario questions BEFORE researching libraries
   - **Cost**: Wasted time installing/uninstalling 160+ dependencies, creating wrong component
   - **Fix**: New mandatory rule #2 - ALWAYS clarify ambiguous UX terms with examples FIRST

2. **Library API Misuse**: Used Novel's low-level API (`EditorRoot` + `EditorContent`) with empty `extensions={[]}`
   - **Error**: "Schema is missing its top node type ('doc')" → white screen
   - **Why**: Didn't read documentation carefully enough, didn't test minimal example first
   - **Fix**: Updated rule #3 - verify API examples, test in isolation before integration

3. **No Incremental Testing**: Made multiple changes, then tested → couldn't isolate which change broke things
   - **Fix**: New mandatory rule #10 - test after EACH significant change

4. **react-markdown API Change**: Used `className` prop (removed in v10+)
   - **Error**: "Unexpected className prop, remove it"
   - **Why**: Didn't check package version or changelog
   - **Fix**: Updated rule #3 - check version + changelog for external libraries

5. **Leftover Code After Refactor**: Removed `isEditingNotes` state but forgot `setIsEditingNotes(false)` call
   - **Error**: "setIsEditingNotes is not defined"
   - **Why**: Didn't systematically find all references before deleting
   - **Fix**: New mandatory rule #11 - use "Find All References", search string literals, test after removal

6. **Missing Tailwind Typography Plugin**: Used `prose` classes without `@tailwindcss/typography` installed
   - **Result**: Headings, lists didn't format properly
   - **Fix**: Verify CSS framework plugins/dependencies are configured

**Key Takeaway**: **Clarification BEFORE coding prevents wasted work**. One minute asking questions saves hours implementing the wrong solution. The correct solution (MarkdownField with react-markdown) was simpler, smaller, and exactly what the user wanted.

### Historical Key Patterns (Condensed)
- **Hooks Order**: Always define derived state BEFORE useEffect that uses it
- **Callback Stability**: Never pass inline callbacks to custom hooks → wrap in useCallback
- **Search-First**: Update ALL occurrences (frontend + backend) when changing shared logic
- **Security**: Filter at query level (`.eq('user_id', user.id)`) BEFORE `.single()`
- **Post-Migration Validation**: Query actual data, don't trust NOTICE logs alone
- **Cross-Reference Patterns**: Check ALL CLAUDE.md patterns before marking complete

## Project Status (Updated 2025-10-10)

**Latest Update (2025-10-10)**:
- **Markdown Editor Upgrade**: Replaced split-view editor with Obsidian-style toggle (raw markdown ↔ formatted preview)
  - Uses react-markdown + remark-gfm + rehype-sanitize
  - 60% smaller bundle size (976 KB → 389 KB vendor.js)
  - Single field, click to edit → raw markdown visible, blur/save → formatted output
  - GitHub Flavored Markdown support (tables, task lists, strikethrough)
  - Tailwind Typography plugin for proper heading/list/blockquote styling

**Core Features**:
- ✅ React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- ✅ Supabase authentication & storage (no localStorage)
- ✅ YouTube Shorts/Videos: Metadata extraction, transcript extraction (English → auto-language fallback)
- ✅ Short-Video type: First-class type with flat metadata, purple theme, platform filtering
- ✅ URL Processing: Dashboard input, auto-processing, duplicate detection
- ✅ Multiple jobs per URL supported (cache removed)

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