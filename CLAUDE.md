# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY: Read This File FIRST

1. **READ THIS FILE FIRST**: Before making ANY assumptions, read this document. It contains lessons learned from past mistakes.

2. **DOCUMENTATION-FIRST**: Always check official documentation for Supabase, Vercel, and complex libraries before coding. Use the **Context7 MCP** tools for library docs.

3. **SEARCH-FIRST PATTERN (Prevents 90% of Integration Bugs)**: Before creating ANY utility function, search for existing ones first: `rg "normalize" --type ts` or `rg "function.*Url" --type ts`. Reuse existing functions (especially `normalizeUrl`, `detectPlatform`) to ensure consistency. Update ALL occurrences in both `src/` and `supabase/functions/` simultaneously.

4. **Use Storage Adapter Only**: Always `import { useStorageAdapter } from '@/data/storageAdapter'`. Never import `storage.ts` or `supabaseStorage.ts` directly.

5. **Security at Query Level**: Add `.eq('user_id', user.id)` to Supabase queries BEFORE `.single()`. Never fetch first then check permission (timing attack vulnerability).

6. **No Placeholders**: Before claiming "complete", ensure: real endpoints, passes `npm run lint` + `npm run build`, end-to-end test works.

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
2. Never use `supabase start` or Docker containers
3. Never commit secrets - use Supabase secrets for API keys like `YOUTUBE_API_KEY`
4. Never use `VITE_` prefix for server-side secrets (exposes to browser)

### Database Migration Best Practices

*   **CRITICAL: Use ASCII-only in SQL files**. Unicode characters (e.g., emojis ✅⚠️) in migrations WILL cause deployment failures.
*   Use modern PostgreSQL functions: `gen_random_uuid()` instead of `uuid_generate_v4()`.
*   Handle Unicode/emojis carefully in your application code when storing them in JSONB.
*   Never delete old migration files.

### Commands

*   `npm run dev`: Start dev server on port 2222.
*   `npm run build`: Build for production.
*   `npm run lint`: Check code quality.
*   `npm install`: Install dependencies.

## Architecture Quick Reference

**Tech Stack**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Supabase


## Testing Checklist (MANDATORY After Changes)

### Build & Quality
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run dev` starts without errors

### End-to-End Workflow
- [ ] Navigate to all routes: `/`, `/resources`, `/resources/new`, `/resource/:id`, `/settings`
- [ ] Create resource → verify navigation to detail page
- [ ] Test both authenticated (Supabase) and unauthenticated (localStorage) modes
- [ ] Verify loading states and error handling

### Full-Stack Features (Frontend + Backend)
- [ ] Search for shared logic in BOTH `src/` and `supabase/functions/`
- [ ] Update ALL occurrences before testing
- [ ] Deploy frontend (auto on save) AND backend (`npx supabase functions deploy <name>`)
- [ ] Test COMPLETE user flow end-to-end
- [ ] Verify console logs on BOTH sides

## Critical Code Patterns

### React Hooks Order & Dependencies
**Hook Execution Order** (CRITICAL - violating causes "Cannot access before initialization"):
1. All `useState` declarations
2. All `useQuery`/`useMutation` calls
3. **Derived state** (computed from hooks above)
4. All `useEffect`/`useCallback`/`useMemo` hooks

Avoid referencing derived state (e.g., flags from queries/mutations) before it is declared. Define derived state first, then reference it in effects.

**Callback Stability** (CRITICAL - violating causes infinite loops):
- **NEVER pass inline callbacks to custom hooks** → creates re-render cascade
- Inline functions = new reference every render → all dependencies update → re-render loop
Prefer returning values from hooks and reacting in components. If a callback is unavoidable, stabilize it with `useCallback`.

### React Query: Pure queryFn & Reliable State
Keep `queryFn` pure - **never** call `setLoading(false)` or `setState()` inside it. Use `onSuccess`, `onError`, or `onSettled` callbacks for side effects. Putting state updates in `queryFn` breaks retry/refetch logic.

**Critical State Flags** (CRITICAL - callbacks don't always fire):
- **DON'T rely on `onSettled`/`onSuccess` for critical state** (caching/strict mode breaks them)
- **DO set state in effects that handle query data** (always run when data changes)
Use an effect that watches reliable flags (e.g., `query.isFetched`) to set critical state; do not depend solely on callbacks.

### Data Hierarchy: Cascading Ternary
Display exactly one creator field. Prefer `channelName`; otherwise fall back to `handle`, then `author`, then `creator`. This prevents duplicate names from multiple metadata sources.

### Type Safety: Discriminated Unions
For mutually exclusive params, use `| { jobId: string; normalizedUrl?: never } | { normalizedUrl: string; jobId?: never }`. Compiler catches invalid combinations at build-time instead of runtime.

### Async State Management
All data operations need `loading`/`error` state: wrap in `try/catch/finally`, call `setLoading(true)` before, `setError(null)` to clear, `setLoading(false)` in `finally` block.

### Switch Statement Block Scope
Wrap each case in `{ }` braces to scope `const` declarations: `case 'video': { const metadata = ...; }`. Prevents variable name conflicts between cases.

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

## Lessons Learned (Quick Reference)

**URL Processing Refactor (2025-09-30) - Critical Mistakes**:
1. **Hooks Order Violation**: Defined `isProcessing` AFTER useEffect that used it → "Cannot access before initialization" crash
2. **Infinite Loop**: Passed inline callback to `useUrlDetection` → unstable reference cascade → infinite re-renders
3. **Unreliable Callback**: Relied on `query.onSettled` for critical flag → never fired due to caching
4. **Duplicate Detection Bug**: Created new `new URL().toString()` instead of reusing `normalizeUrl()` → comparison failed

**Phase 5 Mistakes & Fixes**:
1. **URL Normalization Mismatch**: Fixed frontend, forgot backend → Always search-first with `rg`
2. **Hook Order Violation**: Added `useEffect` in middle → Only add at END of all hooks
3. **Security Gap**: Checked `user_id` after fetch → Always filter at query level
4. **Duplicate Display**: Showed same creator 3x → Cascading ternary for hierarchy
5. **React Query Side Effects**: Set state in `queryFn` → Use `onSettled` callback

**What Worked**:
- Systematic use of TodoWrite tool for tracking
- Debug logging immediately identified root causes
- Deep thinking before coding (architecture analysis)
- Comprehensive code review caught issues pre-production

**Key Takeaway**: THE GUIDANCE WAS ALREADY IN CLAUDE.md. Read patterns BEFORE coding. Search for existing utilities BEFORE creating new ones.

## Project Status (Updated 2025-09-30)

**Completed**:
- ✅ Phases 1-6: Core frontend, authentication, hybrid storage (Supabase + localStorage)
- ✅ Short-Form Video Phase 5: YouTube integration, metadata extraction, dashboard UI, job recovery
- ✅ URL Processing Refactor: Dashboard input, auto-processing, duplicate detection, front/back parity

**Recent Enhancements**:
- Dashboard URL input with smart routing (processable vs manual)
- ProcessVideo auto-start with job recovery
- Duplicate URL detection prevents re-processing
- Front/back normalization parity (fixed youtu.be bug)

**Next**:
- 🎯 Short-Form Video Phase 6: Observability, hardening, launch prep

**Limitations**:
- ⏳ Transcript extraction not yet implemented
- ⏳ TikTok/Instagram require app approvals

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