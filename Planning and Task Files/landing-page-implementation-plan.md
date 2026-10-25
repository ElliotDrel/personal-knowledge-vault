# Landing Page Implementation Plan

**Date:** 2025-11-05
**Feature Branch:** `claude/landing-page-feature-011CUpoCuLzuGXECmexqu3oi`
**Status:** Ready for Implementation

---

## Overview

Add a public landing page at `/` and migrate all existing authenticated routes under `/dashboard/*`. The landing page will combine Template B's story-driven structure with all features from Template A.

---

## Final Landing Page Structure

### Sections (Top to Bottom)

#### 1. Hero Section (Template B Style)
- Large gradient text: "Turn Content Into Knowledge"
- Subtitle: "Stop letting great ideas slip away. Knowledge Vault helps you capture, organize, and revisit insights from videos, articles, and more."
- Large gradient CTA button: "Get Started"
- Small text below: "Already have an account? Sign in"

#### 2. The Problem (Template B)
- Text: "Watching great content but forgetting it all? Scattered notes across apps? Losing track of valuable insights?"
- Transition: "There's a better way."

#### 3. How It Works (Template A) - 3-Step Process
- **Step 1:** "📥 Capture" - Paste any YouTube, TikTok, or Instagram URL
- **Step 2:** "🧠 Process" - AI extracts transcripts and key insights
- **Step 3:** "📚 Organize" - Build your personal knowledge library
- CTA Button: "Start Building Your Vault"

#### 4. Key Features (Merge Template A + B)
Grid of 6 feature cards:
- 🎥 **Video Insights** - Extract transcripts from YouTube Shorts, TikTok, Instagram Reels
- 🤖 **AI-Powered Notes** - Automatically generate summaries and smart suggestions
- 💬 **Smart Comments** - Add threaded notes and discussions to your resources
- 🔗 **Duplicate Detection** - Never save the same resource twice
- 🚀 **Instant Processing** - Paste a URL, get transcripts in seconds
- 📊 **Beautiful Organization** - See your knowledge grow with stats and insights

CTA Button: "Get Started Free"

#### 5. Final CTA (Template B)
- Large centered text: "Your ideas deserve a home"
- Subtitle: "Join others who are building their knowledge vault."
- Large CTA Button: "Create Free Account"
- Small text: "Already a member? Sign in"

#### 6. Footer
- Logo + Copyright text

### Navigation Bar (Fixed at Top)
- **Left:** Logo (Brain icon) + "Knowledge Vault" text
- **Right:** Dynamic button
  - If **not authenticated**: "Sign In / Sign Up" → routes to `/auth`
  - If **authenticated**: "Go to App" → routes to `/dashboard`

### Design System
- Reuse existing: `bg-gradient-knowledge`, `bg-gradient-card`, `shadow-card`, `transition-smooth`
- Use shadcn/ui components: Button, Card, Badge
- Use lucide-react icons throughout
- Tailwind utility classes matching current design

---

## Route Migration Plan

### New Route Structure

| **Old Route** | **New Route** | **Auth Required** |
|---------------|---------------|-------------------|
| `/` (Dashboard) | `/dashboard` | ✅ Yes |
| `/resources` | `/dashboard/resources` | ✅ Yes |
| `/resources/new` | `/dashboard/resources/new` | ✅ Yes |
| `/resources/process` | `/dashboard/resources/process` | ✅ Yes |
| `/resource/:id` | `/dashboard/resource/:id` | ✅ Yes |
| `/settings` | `/dashboard/settings` | ✅ Yes |
| `/auth` | `/auth` (unchanged) | ❌ No |
| **NEW:** `/` | Landing page | ❌ No |

---

## Implementation Steps

### Step 1: Create Landing Page Component

**File:** `src/pages/Landing.tsx`

**Purpose:**
- New public page component (no auth required)
- Custom navigation bar (simpler than Layout component)
  - Logo links to `/` (landing page)
  - Dynamic button in top right checks auth status
  - If `user` exists: "Go to App" button → navigates to `/dashboard`
  - If no `user`: "Sign In / Sign Up" button → navigates to `/auth`
- All sections as described in structure
- All CTA buttons route to `/auth`
- Reuses existing design system (gradients, cards, buttons, icons)

**Rationale:**
- Doesn't use `Layout` component (which includes sidebar nav for authenticated users)
- Self-contained with its own simpler navigation
- Dynamic button checks auth state client-side for instant UI updates
- Minimal code by reusing existing UI components

---

### Step 2: Update App.tsx Routes

**File:** `src/App.tsx`

**Changes:**
- Add new public route for Landing page at `/`
- Move all protected routes under `/dashboard/*` prefix
- Keep `/auth` route unchanged
- Maintain `RequireAuth` wrapper for all protected routes

**Rationale:**
- Keeps auth protection consistent
- Clear separation: public routes at top, protected under `/dashboard/*`
- Catch-all 404 stays at the end

---

### Step 3: Update Navigation Component

**File:** `src/components/layout/Navigation.tsx`

**Changes:**
1. Update navigationItems array to use `/dashboard/*` paths
2. Update logo link to `/dashboard` (only shown when authenticated)
3. Update "Add Resource" button link to `/dashboard/resources/new`
4. Update Settings dropdown link to `/dashboard/settings`

**Rationale:**
- Navigation component only shown when authenticated
- Logo can safely link to `/dashboard`
- All internal nav links point to new structure
- No changes needed for Sign In button (still `/auth`)

---

### Step 4: Update Auth Page Redirect Logic

**File:** `src/pages/Auth.tsx`

**Changes:**
- Change default redirect from `/` to `/dashboard`
- Maintain respect for explicit redirect parameters

**Rationale:**
- Always redirects to `/dashboard` after successful authentication
- Still respects explicit redirect if user was blocked from specific page
- Auth page stays at `/auth` (unchanged public route)

---

### Step 5: Update RequireAuth Component

**File:** `src/components/auth/RequireAuth.tsx`

**Changes:** None needed!

**Rationale:**
- Already redirects unauthenticated users to `/auth` correctly
- Already passes attempted location as state
- Auth.tsx handles the redirect back to `/dashboard`

---

### Step 6: Update All navigate() Calls

**Files to Update:**

#### `src/pages/ResourceDetail.tsx`
- `navigate('/resources')` → `navigate('/dashboard/resources')`

#### `src/pages/NewResource.tsx`
- `navigate('/resource/${savedResource.id}')` → `navigate('/dashboard/resource/${savedResource.id}')`

#### `src/pages/Dashboard.tsx`
- `navigate('/resources/process?url=...')` → `navigate('/dashboard/resources/process?url=...')`
- `navigate('/resource/${existingResource.id}')` → `navigate('/dashboard/resource/${existingResource.id}')`
- `navigate('/resources/new...')` → `navigate('/dashboard/resources/new...')`

#### `src/pages/ProcessVideo.tsx`
- `navigate('/')` (2 instances) → `navigate('/dashboard')`
- `navigate('/resource/${duplicateResource.id}')` → `navigate('/dashboard/resource/${duplicateResource.id}')`
- `navigate('/resource/${savedResource.id}')` → `navigate('/dashboard/resource/${savedResource.id}')`

**Rationale:**
- Updates all internal navigation to match new route structure
- Prevents broken links and 404 errors
- Maintains existing navigation flow under new paths

---

### Step 7: Update All Link Components

**Files to Update:**

#### `src/pages/ResourceDetail.tsx`
- `<Link to="/resources">` → `<Link to="/dashboard/resources">`

#### `src/pages/NewResource.tsx`
- `<Link to="/">` → `<Link to="/dashboard">`
- `<Link to="/settings">` → `<Link to="/dashboard/settings">`

#### `src/pages/Dashboard.tsx`
- `<Link to="/resources">` → `<Link to="/dashboard/resources">`

#### `src/pages/Resources.tsx`
- `<Link to="/resources/new">` → `<Link to="/dashboard/resources/new">`

#### `src/pages/NotFound.tsx`
- Keep: `<Link to="/">` (should go to landing page, not dashboard)

#### `src/components/resources/ResourceCard.tsx`
- `<Link to={'/resource/${resource.id}'}>` (2 instances) → `<Link to={'/dashboard/resource/${resource.id}'}>`

**Rationale:**
- Updates all hardcoded route strings throughout the app
- NotFound page correctly sends users to public landing page
- ResourceCard links go to correct dashboard resource detail page

---

### Step 8: Testing & Validation

**Manual Testing Checklist:**

#### Landing Page (Public)
- [ ] Visit `/` while logged out → should show landing page
- [ ] "Sign In / Sign Up" button shows when not authenticated
- [ ] Click "Get Started" → routes to `/auth`
- [ ] All CTA buttons work correctly

#### Landing Page (Authenticated)
- [ ] Visit `/` while logged in → should show landing page
- [ ] "Go to App" button shows when authenticated
- [ ] Click "Go to App" → routes to `/dashboard`

#### Authentication Flow
- [ ] Sign in via `/auth` → redirects to `/dashboard`
- [ ] Try accessing `/dashboard` without auth → redirects to `/auth`
- [ ] After login, lands on `/dashboard`

#### Dashboard Navigation
- [ ] All nav links work (Dashboard, Resources, Settings)
- [ ] Logo links to `/dashboard`
- [ ] "Add Resource" button goes to `/dashboard/resources/new`

#### Resource Flows
- [ ] Click resource card → goes to `/dashboard/resource/:id`
- [ ] "View All Resources" → goes to `/dashboard/resources`
- [ ] Process video → goes to `/dashboard/resources/process`
- [ ] After creating resource → redirects to `/dashboard/resource/:id`
- [ ] Cancel buttons return to `/dashboard`

#### Edge Cases
- [ ] Visit invalid route → NotFound page shows with link back to `/` (landing)
- [ ] Manual URL changes work correctly
- [ ] Browser back/forward buttons work
- [ ] No console errors for routing

**Build Validation:**
```bash
npm run build
npm run lint
```

---

## Why This Approach is Optimal

### 1. Minimal Code Changes
- Reuses existing UI components and design system
- Landing page is self-contained (doesn't modify Layout)
- Route changes are straightforward string replacements

### 2. Clear Separation of Concerns
- Public routes (`/`, `/auth`) clearly separated from protected routes (`/dashboard/*`)
- Landing page has its own simple navigation
- Dashboard retains full Layout with sidebar nav

### 3. Maintains Auth Security
- All protected routes still wrapped with `RequireAuth`
- Auth flow unchanged except redirect target
- No security regressions

### 4. Future-Proof Structure
- Easy to add more public pages under root (`/about`, `/pricing`, etc.)
- Easy to add more dashboard features under `/dashboard/*`
- Route structure is conventional and predictable

### 5. User Experience
- Authenticated users can still access landing page to see product info
- Dynamic button provides immediate feedback on auth state
- Clear visual distinction between public and authenticated areas
- All existing functionality preserved

### 6. No Breaking Changes to Data/API
- Only frontend routes change
- No database migrations needed
- No Supabase config changes needed
- No Edge Function updates needed

---

## Files Summary

### Files to Create
1. `src/pages/Landing.tsx` - New landing page component

### Files to Modify
1. `src/App.tsx` - Route definitions
2. `src/components/layout/Navigation.tsx` - Nav links
3. `src/pages/Auth.tsx` - Default redirect
4. `src/pages/Dashboard.tsx` - Navigate calls + Links
5. `src/pages/ProcessVideo.tsx` - Navigate calls
6. `src/pages/ResourceDetail.tsx` - Navigate calls + Links
7. `src/pages/NewResource.tsx` - Navigate calls + Links
8. `src/pages/Resources.tsx` - Links
9. `src/components/resources/ResourceCard.tsx` - Links

### Files NOT Modified
1. `src/components/auth/RequireAuth.tsx` - Already works correctly
2. `src/pages/NotFound.tsx` - Links to `/` (now landing page - perfect!)
3. Any data/storage/API files - No backend changes

---

## Success Criteria

- [ ] Landing page displays correctly at `/`
- [ ] Dynamic auth button works correctly
- [ ] All authenticated routes accessible under `/dashboard/*`
- [ ] All navigation links updated and working
- [ ] Authentication flow redirects to `/dashboard`
- [ ] No broken links or 404 errors
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No console errors in browser
- [ ] All existing functionality preserved

---

## Next Steps After Completion

1. Test all routes manually
2. Run build and lint
3. Commit changes with descriptive message
4. Push to feature branch
5. Create pull request (if needed)
6. Deploy to Vercel for preview

---

**End of Implementation Plan**
