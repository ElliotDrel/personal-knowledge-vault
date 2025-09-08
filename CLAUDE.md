# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

### Package Management
This project uses npm with a package-lock.json file. Use `npm install` to install dependencies.

## Architecture

This is a React-based personal knowledge storage application built with:
- **Vite** as the build tool and development server
- **React 18** with React Router for routing
- **TypeScript** for type safety
- **shadcn/ui** component library with Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens
- **TanStack Query** for state management
- **React Hook Form** with Zod validation

### Key Architecture Patterns

**Component Structure:**
- `src/components/ui/` - shadcn/ui components (auto-generated, avoid editing)
- `src/components/layout/` - Layout components (Layout, Navigation)
- `src/components/resources/` - Domain-specific components
- `src/pages/` - Route components (Dashboard, Resources, ResourceDetail, Settings, NotFound)

**Data Layer:**
- `src/data/mockData.ts` - Mock data and utility functions for resources
- Resource interface defines the core data model with types: book, video, podcast, article
- Each resource has metadata (author/creator, platform, duration, etc.), content (description, notes, transcript), and organizational data (tags, dates)

**Routing:**
Routes are defined in App.tsx:
- `/` - Dashboard (main landing page)
- `/resources` - Resources listing
- `/resource/:id` - Individual resource detail
- `/settings` - Application settings
- `*` - NotFound catch-all

**Styling System:**
- Uses Tailwind with CSS variables defined in `src/index.css`
- Custom gradient and shadow utilities for design consistency
- Component-specific color variants defined in `tailwind.config.ts`
- shadcn/ui configuration in `components.json`

**State Management:**
- TanStack Query for server state (set up but using mock data currently)
- React Hook Form for form state
- Context providers configured in App.tsx

### File Aliases
- `@/` maps to `src/`
- Import paths use the @ alias consistently throughout the codebase

### Development Notes
- The project uses ESLint with TypeScript rules
- Unused variables warning is disabled in eslint config
- Uses SWC for faster React compilation in Vite
- Component tagging is enabled in development mode via lovable-tagger