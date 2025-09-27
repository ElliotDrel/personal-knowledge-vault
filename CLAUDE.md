# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MANDATORY: Read This File FIRST

**CRITICAL RULE**: Before making ANY assumptions about tools, workflows, or architecture:
1. **READ this entire CLAUDE.md file thoroughly**
2. **CHECK existing code patterns and imports**
3. **VERIFY current project status and phase completion**
4. **UNDERSTAND the established workflows before suggesting alternatives**

**Failure to read documentation first leads to:**
- Wasted time on incorrect approaches
- Contradicting established workflows
- Making assumptions about missing tools that actually exist
- Implementing solutions that conflict with existing architecture

## ⚠️ IMPORTANT: Documentation First Approach

**ALWAYS check relevant documentation before coding**, especially when working with:
- **Supabase** - Database operations, authentication, real-time features
- **Vercel** - Deployment configuration, serverless functions, environment variables
- **Complex libraries** - React Router, shadcn/ui, Tailwind CSS, Playwright, etc.

## ⚠️ CRITICAL: Supabase Development Workflow

**CLI-Only Development Rule**: This project uses Supabase CLI exclusively for schema and configuration management against the deployed/hosted Supabase project. **NO local Docker setup or `supabase start` commands.**

### Required Supabase Workflow:
1. **Project Management**: Work against deployed Supabase projects only
2. **Configuration**: All auth settings, database schema, and project config managed via `supabase/config.toml`
3. **Deployment**: Use `supabase db push` to deploy changes to remote project
4. **No Local Services**: Never use `supabase start`, Docker containers, or local database instances

### CLI Commands for Development:
```bash
# Project setup (run with npx prefix)
npx supabase init                    # Initialize config files
npx supabase login                   # Authenticate with Supabase
npx supabase link --project-ref <id> # Link to hosted project

# Configuration management
npx supabase db push                 # Deploy local config to remote
npx supabase db pull                 # Pull remote config changes
npx supabase validate               # Validate config before deployment

# Auth configuration via config.toml only
# Database schema via migrations only
# No dashboard clicking for configuration
```

### Database Migration Best Practices:
- **Use modern PostgreSQL functions**: `gen_random_uuid()` instead of `uuid_generate_v4()`
- **Handle Unicode/emojis carefully**: Test emoji storage in JSONB fields
- **CRITICAL: Use ASCII-only in SQL files**: Unicode characters (✅⚠️) cause deployment failures
- **Document object dependencies**: Track triggers → policies → functions → tables → enums for removal order
- **Test end-to-end workflows**: Ensure navigation works after database changes
- **Use incremental migrations**: Separate schema changes from data fixes
- **Always verify CLI is linked**: Check project connection before pushing migrations
- **Preserve migration history**: Never delete migration files, even for removed features

**Rationale**: This approach ensures all changes are version-controlled, reproducible, and eliminates dependency on local Docker setup while maintaining full control over project configuration.

When implementing features with these technologies:
1. **Use Context7 MCP for library documentation** - Retrieve up-to-date documentation and code examples for any library using `mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs`
2. **Search official websites** using WebFetch or WebSearch tools for general documentation
3. Review API references and best practices
4. Check for breaking changes or deprecated patterns
5. Understand configuration requirements before coding

### Context7 MCP Usage Pattern:
```
1. Resolve library ID: mcp__context7__resolve-library-id with library name
2. Get documentation: mcp__context7__get-library-docs with the resolved library ID
3. Optional: Use 'topic' parameter to focus on specific areas (e.g., 'hooks', 'routing')
4. Optional: Adjust 'tokens' parameter for more/less documentation context
```

**Examples:**
- For React testing: Resolve "@testing-library/react" → Get docs with topic "hooks"
- For Playwright: Resolve "@playwright/test" → Get docs with topic "assertions"
- For Next.js: Resolve "next" → Get docs with topic "routing"

This prevents implementation errors, ensures best practices, and saves development time.

## Commands

### Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

### Package Management
This project uses npm. Use `npm install` to install dependencies.

### Testing and Browser Automation
The project has access to the **Playwright MCP server** for browser automation and testing:

**When to Use Playwright MCP:**
- End-to-end testing of user workflows
- Visual testing and screenshot comparison
- Form submission testing
- Navigation and routing verification
- Accessibility testing
- Performance testing in real browsers

**Available Playwright Tools:**
- `mcp__playwright__browser_navigate` - Navigate to URLs
- `mcp__playwright__browser_snapshot` - Capture accessibility snapshots (preferred over screenshots for actions)
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text into fields
- `mcp__playwright__browser_fill_form` - Fill multiple form fields
- `mcp__playwright__browser_take_screenshot` - Take visual screenshots
- `mcp__playwright__browser_wait_for` - Wait for elements or time

**Usage Pattern:**
1. Use `browser_navigate` to open the application
2. Use `browser_snapshot` to understand page structure
3. Perform actions like clicks and form fills
4. Verify results with additional snapshots or screenshots

## Architecture

This is a React-based personal knowledge storage application built with:
- **Vite** as the build tool and development server
- **React 18** with React Router for routing
- **TypeScript** for type safety
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens
- **@uiw/react-md-editor** for markdown editing
- **Supabase** for authentication and database persistence (COMPLETED Phase 5-6)
- **Hybrid Storage System** - Automatically switches between Supabase (authenticated) and localStorage (unauthenticated)

### Key Architecture Patterns

**Component Structure:**
- `src/components/ui/` - shadcn/ui components (auto-generated, avoid editing)
- `src/components/layout/` - Layout components (Layout, Navigation)
- `src/components/resources/` - Domain-specific components
- `src/pages/` - Route components (Dashboard, Resources, ResourceDetail, NewResource, Settings, NotFound)

**Data Layer (Phase 6 - Hybrid Storage Architecture):**
- `src/data/storageAdapter.ts` - **CRITICAL: Primary data access layer (ALWAYS USE THIS)**
- `src/data/supabaseStorage.ts` - Supabase backend operations (authenticated users)
- `src/data/storage.ts` - localStorage operations (fallback for unauthenticated users)
- `src/data/mockData.ts` - Resource interfaces and sample data
- **NEVER use mockResources directly** - always use storageAdapter functions
- **NEVER import storage.ts or supabaseStorage.ts directly** - use storageAdapter instead

**Hybrid Storage Pattern:**
```typescript
// ✅ CORRECT - Use hybrid storage adapter
import { useStorageAdapter } from '@/data/storageAdapter';

const storageAdapter = useStorageAdapter(); // Auto-switches based on auth state
const resources = await storageAdapter.getResources();
```

**Available Async Functions:**
- `getResources()`, `addResource()`, `updateResource()`, `getResourceById()`
- `getResourceTypeConfig()`, `addFieldToResourceType()`, `removeFieldFromResourceType()`
- `subscribeToResourceChanges()` - Real-time updates via Supabase or localStorage events

**Routing:**
Routes defined in App.tsx:
- `/` - Dashboard
- `/resources` - Resources listing
- `/resources/new` - Create new resource (critical route)
- `/resource/:id` - Individual resource detail
- `/settings` - Application settings
- `*` - NotFound catch-all

**Styling System:**
- Uses Tailwind with CSS variables defined in `src/index.css`
- Custom gradient and shadow utilities for design consistency
- shadcn/ui configuration in `components.json`

**State Management:**
- Hybrid data persistence via `src/data/storageAdapter.ts` (Supabase + localStorage)
- React Hook Form for form state
- Local component state for UI interactions
- Async state management with loading/error states throughout
- Real-time updates via Supabase subscriptions when authenticated

### File Aliases
- `@/` maps to `src/`
- Import paths use the @ alias consistently throughout the codebase

## Critical Implementation Patterns

### Resource Management (Core Feature - Phase 6 Async Pattern)
```typescript
// ✅ CORRECT - Use async storage adapter
import { useStorageAdapter } from '@/data/storageAdapter';

const Component = () => {
  const storageAdapter = useStorageAdapter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateResource = async (resourceData) => {
    setLoading(true);
    setError(null);
    try {
      const savedResource = await storageAdapter.addResource(resourceData);
      navigate(`/resource/${savedResource.id}`); // ⚠️ CRITICAL: Test navigation!
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
};

// ❌ WRONG - Never use storage layers directly
import { getResources } from '@/data/storage';
import { getResources } from '@/data/supabaseStorage';
```

### Dynamic Form Patterns (Async Configuration)
```typescript
// ✅ CORRECT - Load dynamic configuration asynchronously
const [resourceTypeConfig, setResourceTypeConfig] = useState(null);

useEffect(() => {
  const loadConfig = async () => {
    try {
      const config = await storageAdapter.getResourceTypeConfig();
      setResourceTypeConfig(config);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };
  loadConfig();
}, [storageAdapter]);

const renderTypeSpecificFields = () => {
  if (!selectedType || !resourceTypeConfig) return null;
  const config = resourceTypeConfig[selectedType];
  return config.fields.map(field => /* render field */);
};
```

### Component State Management (Async with Error Handling)
```typescript
// ✅ CORRECT - Async operations with proper error handling
const [notes, setNotes] = useState(resource?.notes || '');
const [saving, setSaving] = useState(false);
const [error, setError] = useState(null);

const handleSave = async () => {
  setSaving(true);
  setError(null);
  try {
    await storageAdapter.updateResource(resource.id, { notes });
    setIsEditing(false);
  } catch (err) {
    setError(err.message);
  } finally {
    setSaving(false);
  }
};
```

## Common Issues & Solutions

### Browser Extension Interference
**Issue**: Shopping/coupon extensions cause console errors
**Solution**: These are cosmetic - extension tries to parse app as e-commerce site
**Action**: Safe to ignore, or use incognito mode for clean console

### Dynamic Configuration Loading
**Issue**: Components show empty fields or loading states
**Solution**: Ensure components load dynamic config with `useEffect(() => setResourceTypeConfig(getResourceTypeConfig()), [])`

### Data Migration Errors
**Issue**: `mockResources is not defined` errors
**Solution**: Always use storage layer functions, never direct mockResources access

### Build Warnings
**Issue**: CSS @import warnings, large bundle size warnings
**Solution**: These are expected with current setup, don't affect functionality

### React Router Warnings
**Issue**: v7 future flag warnings
**Solution**: Cosmetic warnings about upcoming version, safe to ignore

### Navigation Syntax Errors (Phase 6 Lesson)
**Issue**: Template literal syntax errors in navigation code
**Solution**: Always use proper template literals: `navigate(\`/resource/${id}\`)` not `navigate(/resource/)`
**Prevention**: Test navigation end-to-end during implementation

### Database Table Not Found (404 Errors)
**Issue**: PostgREST returns 404 for missing tables during development
**Solution**: Apply database migrations using `npx supabase db push`
**Prevention**: Always deploy migrations before testing new storage features

### Emoji/Unicode Encoding Issues
**Issue**: Emojis appear as question marks in database JSONB fields
**Solution**: Use proper Unicode strings in migrations and test emoji storage
**Prevention**: Test special characters and Unicode in database contexts

### Async State Management Issues
**Issue**: Components break when switching from sync to async storage
**Solution**: Always implement loading/error states for async operations
**Pattern**: Use `useState` for loading/error states and `try/catch` blocks

## Testing After Changes

After making larger changes, verify functionality with these commands:

```bash
npm install           # Ensure dependencies are up to date
npm run build         # Test production compilation
npm run lint          # Check code quality
npm run dev           # Start development server
```

**Test Core Functionality (MANDATORY after changes):**

**CRITICAL - End-to-End Navigation Testing:**
1. Navigate to all main routes (`/`, `/resources`, `/resources/new`, `/resource/:id`, `/settings`)
2. **Create a new resource and VERIFY it navigates to the correct detail page** ⚠️
3. Test resource detail page loads with correct data
4. Test navigation between different resource detail pages

**Storage & Persistence Testing:**
1. Test both authenticated (Supabase) and unauthenticated (localStorage) modes
2. Create, edit, and delete resources in both modes
3. Test real-time updates if authenticated
4. Verify data isolation between different users

**UI & Configuration Testing:**
1. Edit notes in an existing resource and verify persistence
2. Test search and filtering on resources page
3. Test dynamic settings: Add/remove fields in Settings and verify they appear in NewResource forms
4. **Test emoji display in resource type icons** 📚🎬🎧📄
5. Verify loading states display during async operations
6. Test error handling for failed operations

**Database & Migration Testing (when applicable):**
1. Verify database tables exist via Supabase dashboard
2. Test RLS policies prevent cross-user data access
3. Confirm migration deployment with `npx supabase db push`

## Development Notes

**Current Status** (Updated: Phase 6 Completed):
- **✅ Completed**: Phases 1-6 (Frontend, resource management, authentication, database migration)
  - Phase 1-4: Core frontend structure and dynamic configuration
  - Phase 5: Magic-link authentication system fully operational
  - Phase 6: **COMPLETED** - Hybrid storage architecture with Supabase database backend
- **🎯 Next**: Phase 7 (Sharing & collaboration features)
- **🚀 Future**: Phase 8 (Production deployment and optimization)

### Phase 6 Implementation Summary (COMPLETED)
- ✅ **Hybrid Storage Architecture**: Seamless switching between Supabase (authenticated) and localStorage (unauthenticated)
- ✅ **Database Schema**: Complete with RLS policies, indexes, and triggers
- ✅ **Real-time Updates**: Supabase subscriptions for live data synchronization
- ✅ **Async Operations**: All components updated with proper loading/error states
- ✅ **User Data Isolation**: Row Level Security ensuring user privacy
- ✅ **Migration System**: Deployed via CLI with version control

### Supabase Integration (ACTIVE)
- ✅ Authentication implemented via magic-link email flow
- ✅ All configuration managed through `supabase/config.toml` and CLI commands
- ✅ Database schema and auth settings deployed via `npx supabase db push`
- ✅ Environment variables configured: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- ✅ CLI workflow established and tested

### Technical Notes
- The project uses ESLint with TypeScript rules
- Unused variables warning is disabled in eslint config
- Uses SWC for faster React compilation in Vite
- Component tagging is enabled in development mode via lovable-tagger

## Vercel Hosting & Deployment

- **Platform**: Production is hosted on Vercel at https://personal-knowledge-vault.vercel.app/. The main branch auto-deploys to production; pull requests receive preview deployments.
- **Build command**: Vercel runs 
pm run build (Vite) with Node 18+. The generated assets must live under dist/; avoid relying on files outside that folder.
- **Environment configuration**: Manage environment variables in the Vercel dashboard (Project Settings ? Environment Variables). Keep .env local-only and never commit secrets. Use the same variable names across Production and Preview to avoid surprises.
- **Deployment checklist**:
  1. Run 
npm run build locally before pushing to main.
  2. Scan the emitted dist/assets/*.js for unexpected chunk splits (React core and markdown runtime should stay together; see section above).
  3. After deployment, open the production URL and the Vercel dashboard logs to ensure no runtime errors.
