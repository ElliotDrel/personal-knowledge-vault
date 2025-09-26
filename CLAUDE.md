# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
# Project setup
supabase init                    # Initialize config files
supabase login                   # Authenticate with Supabase
supabase link --project-ref <id> # Link to hosted project

# Configuration management
supabase db push                 # Deploy local config to remote
supabase db pull                 # Pull remote config changes
supabase validate               # Validate config before deployment

# Auth configuration via config.toml only
# Database schema via migrations only
# No dashboard clicking for configuration
```

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
- **Supabase** for authentication and future data persistence (Phase 5+)
- **localStorage** for current data persistence (transitioning to Supabase)

### Key Architecture Patterns

**Component Structure:**
- `src/components/ui/` - shadcn/ui components (auto-generated, avoid editing)
- `src/components/layout/` - Layout components (Layout, Navigation)
- `src/components/resources/` - Domain-specific components
- `src/pages/` - Route components (Dashboard, Resources, ResourceDetail, NewResource, Settings, NotFound)

**Data Layer:**
- `src/data/storage.ts` - **CRITICAL: Always use this for data operations**
- `src/data/mockData.ts` - Resource interfaces and sample data
- **Never use mockResources directly** - always use storage layer functions
- Available functions: `getResources()`, `addResource()`, `updateResource()`, `getResourceById()`
- **Dynamic Configuration**: `getResourceTypeConfig()`, `addFieldToResourceType()`, `removeFieldFromResourceType()`

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
- localStorage for data persistence via `src/data/storage.ts`
- React Hook Form for form state
- Local component state for UI interactions

### File Aliases
- `@/` maps to `src/`
- Import paths use the @ alias consistently throughout the codebase

## Critical Implementation Patterns

### Resource Management (Core Feature)
```typescript
// ✅ CORRECT - Use storage layer
import { getResources, addResource, updateResource } from '@/data/storage';

// ❌ WRONG - Never use mockResources directly
import { mockResources } from '@/data/mockData';
```

### Dynamic Form Patterns
```typescript
// ✅ CORRECT - Use dynamic configuration
const renderTypeSpecificFields = () => {
  if (!selectedType || !resourceTypeConfig) return null;
  const config = resourceTypeConfig[selectedType];
  return config.fields.map(field => /* render field */);
};
```

### Component State Management
```typescript
// Controlled components with immediate persistence
const [notes, setNotes] = useState(resource?.notes || '');
const handleSave = () => {
  updateResource(resource.id, { notes });
  setIsEditing(false);
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

## Testing After Changes

After making larger changes, verify functionality with these commands:

```bash
npm install           # Ensure dependencies are up to date
npm run build         # Test production compilation
npm run lint          # Check code quality
npm run dev           # Start development server
```

**Test Core Functionality:**
1. Navigate to all main routes (`/`, `/resources`, `/resources/new`, `/resource/:id`, `/settings`)
2. Create a new resource and verify it saves
3. Edit notes in an existing resource and verify persistence
4. Test search and filtering on resources page
5. Test dynamic settings: Add/remove fields in Settings and verify they appear in NewResource forms

## Development Notes

**Current Status**:
- **Completed**: Phases 1-4 (Frontend structure, resource management, dynamic configuration)
- **In Progress**: Phase 5 (Supabase authentication with magic-link email)
- **Next**: Phase 6 (Database migration to Supabase)

See `Planning and Task Files/9-7 - Original Planning Files/implementation_plan.md` for detailed feature completion status and development roadmap.

### Supabase Integration Notes
- Authentication will be implemented via magic-link email flow
- All Supabase configuration managed through `supabase/config.toml` and CLI commands
- Database schema and auth settings deployed via `supabase db push`
- Environment variables required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Technical Notes
- The project uses ESLint with TypeScript rules
- Unused variables warning is disabled in eslint config
- Uses SWC for faster React compilation in Vite
- Component tagging is enabled in development mode via lovable-tagger