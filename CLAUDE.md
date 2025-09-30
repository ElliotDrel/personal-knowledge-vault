# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY: Read This File FIRST

1. **READ THIS FILE FIRST**: Before making ANY assumptions, read this document. It contains lessons learned from past mistakes.

2. **DOCUMENTATION-FIRST**: Always check official documentation for Supabase, Vercel, and complex libraries before coding. Use the **Context7 MCP** tools for library docs.

3. **SEARCH-FIRST PATTERN (Prevents 90% of Integration Bugs)**: Run `rg "normalizeUrl" --type ts` to find ALL occurrences in both `src/` and `supabase/functions/`. Update all locations simultaneously.

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

### React Hooks Order
**NEVER add `useEffect` in the middle of other hooks** - only at the very end. Hot reload changes hook order causing crashes. Use inline `console.log()` instead, or place `useEffect` after all `useState`/`useQuery`/`useMutation` calls.

### React Query: Pure queryFn
Keep `queryFn` pure - **never** call `setLoading(false)` or `setState()` inside it. Use `onSuccess`, `onError`, or `onSettled` callbacks for side effects. Putting state updates in `queryFn` breaks retry/refetch logic.

### Data Hierarchy: Cascading Ternary
Display **one creator field** using cascading ternary: `channelName ? ... : handle ? ... : author ? ... : creator ? ... : null`. Prevents showing "John Doe" three times from different metadata sources.

### Type Safety: Discriminated Unions
For mutually exclusive params, use `| { jobId: string; normalizedUrl?: never } | { normalizedUrl: string; jobId?: never }`. Compiler catches invalid combinations at build-time instead of runtime.

### Async State Management
All data operations need `loading`/`error` state: wrap in `try/catch/finally`, call `setLoading(true)` before, `setError(null)` to clear, `setLoading(false)` in `finally` block.

### Switch Statement Block Scope
Wrap each case in `{ }` braces to scope `const` declarations: `case 'video': { const metadata = ...; }`. Prevents variable name conflicts between cases.

## Common Issues

| Issue | Solution |
|-------|----------|
| **404 Table Not Found** | Run `npx supabase db push` to deploy migrations |
| **Frontend/Backend Mismatch** | Search-first pattern: `rg "normalizeUrl" --type ts` → update ALL files |
| **Hooks Order Error** | Move all `useEffect` calls to END of component after other hooks |
| **Duplicate Creator Display** | Use cascading ternary (platform-specific > generic fields) |
| **Background Polling Noise** | Hard refresh: `Ctrl+Shift+R` (Win) / `Cmd+Shift+R` (Mac) |
| **Navigation Template Errors** | Use proper template literals: `` navigate(`/resource/${id}`) `` |
| **Emoji Display Issues** | Test Unicode in JSONB; keep SQL files ASCII-only |
| **React Query Side Effects** | Never set state in `queryFn`; use `onSuccess`/`onSettled` callbacks |

## Lessons Learned (Quick Reference)

**Phase 5 Mistakes & Fixes**:
1. **URL Normalization Mismatch**: Fixed frontend, forgot backend → Always search-first with `rg`
2. **Hook Order Violation**: Added `useEffect` in middle → Only add at END of all hooks
3. **Security Gap**: Checked `user_id` after fetch → Always filter at query level
4. **Duplicate Display**: Showed same creator 3x → Cascading ternary for hierarchy
5. **React Query Side Effects**: Set state in `queryFn` → Use `onSettled` callback

**What Worked**:
- Systematic use of TodoWrite tool for tracking
- Comprehensive code review caught issues pre-production
- End-to-end testing validated complete workflow

**Key Takeaway**: THE GUIDANCE WAS ALREADY IN CLAUDE.md. Read patterns BEFORE coding.

## Project Status (Updated 2025-09-30)

**Completed**:
- ✅ Phases 1-6: Core frontend, authentication, hybrid storage (Supabase + localStorage)
- ✅ Short-Form Video Phase 5: YouTube integration, metadata extraction, dashboard UI, job recovery

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