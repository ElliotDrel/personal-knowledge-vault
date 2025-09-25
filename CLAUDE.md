# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

### Package Management
This project uses npm. Use `npm install` to install dependencies.

## Architecture

This is a React-based personal knowledge storage application built with:
- **Vite** as the build tool and development server
- **React 18** with React Router for routing
- **TypeScript** for type safety
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens
- **@uiw/react-md-editor** for markdown editing
- **localStorage** for data persistence

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

**Current Status**: See `Planning and Task Files/9-7 - Original Planning Files/implementation_plan.md` for detailed feature completion status and development roadmap.

### Technical Notes
- The project uses ESLint with TypeScript rules
- Unused variables warning is disabled in eslint config
- Uses SWC for faster React compilation in Vite
- Component tagging is enabled in development mode via lovable-tagger