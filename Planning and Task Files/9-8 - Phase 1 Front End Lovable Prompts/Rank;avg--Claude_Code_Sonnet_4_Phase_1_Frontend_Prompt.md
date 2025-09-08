# 🧠 Personal Knowledge Vault - Lovable Implementation Prompt

## Project Overview & Vision
Build a **Personal Knowledge Vault** - a resource-centric note-taking and sharing platform designed for a maximum of 5 users. This is a desktop-only application focused on organizing knowledge around specific resources (books, videos, podcasts, short-form content) with simple sharing capabilities.

**Core Philosophy**: Simple, elegant, and functional. Each resource gets its own dedicated space for notes, metadata, and transcripts.

## Technical Stack Requirements
- **Framework**: Next.js 14 with TypeScript and App Router
- **Styling**: Tailwind CSS with clean, minimal design
- **Markdown Editor**: @uiw/react-md-editor for note-taking
- **Forms**: react-hook-form for resource creation
- **State Management**: React Context or simple state management
- **Database**: Prepare for Supabase integration (start with localStorage for Phase 1)
- **Authentication**: Magic link system (email-only, no passwords)

## Resource Types & Required Fields

### 1. Books
- Title (required)
- Author
- Publication Year
- Genre
- Description

### 2. Long-form Videos
- Title (required)
- Creator/Channel
- URL
- Duration
- Platform (YouTube, Vimeo, etc.)
- Description

### 3. Podcasts
- Title (required)
- Host
- Episode Number
- URL
- Duration
- Description

### 4. Short-form Content
- Title (required)
- Creator
- Platform (TikTok, YouTube Shorts, Instagram Reels)
- URL
- Description

## Core TypeScript Interfaces

```typescript
interface ResourceType {
  id: string;
  name: 'books' | 'videos' | 'podcasts' | 'short-form';
  displayName: string;
  fields: ResourceField[];
}

interface ResourceField {
  name: string;
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
}

interface Resource {
  id: string;
  type: string;
  metadata: Record<string, string>;
  notes: string;
  transcript?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId?: string;
}

interface Share {
  id: string;
  resourceId?: string;
  userEmail: string;
  accessLevel: 'viewer' | 'editor';
  workspaceShare: boolean;
  createdAt: Date;
}
```

## Application Structure & Pages

### 1. Main Layout
- Clean header with navigation
- Logo/title: "Knowledge Vault"
- Navigation: Dashboard, All Resources, Settings
- No footer required
- Responsive grid system using Tailwind

### 2. Dashboard Page (`/`)
**Layout Requirements:**
- Welcome message with user's name
- Prominent "Add New Resource" button (large, centered)
- "Share Workspace" button (secondary styling)
- Recent resources section (last 5 created)
- Quick stats: Total resources, Total shares
- Quick navigation to other sections

**Key Components:**
- RecentResourcesList
- QuickStats
- CTAButtons

### 3. All Resources Page (`/resources`)
**Layout Requirements:**
- Page title: "All Resources"
- Filter buttons for resource types (Books, Videos, Podcasts, Short-form, All)
- Search bar for title/description search
- Sort dropdown (Title A-Z, Date Created, Last Modified)
- Grid/List view of resources
- Each resource card shows: Title, Type badge, Creation date, truncated notes preview

**Key Components:**
- ResourceFilters
- ResourceSearch
- ResourceGrid
- ResourceCard

### 4. Individual Resource Page (`/resource/[id]`)
**Detailed Layout Structure:**
```
┌─ Resource Header ─────────────────────────┐
│ [Resource Title]                    [Edit] │
│ [Type Badge] • [Creation Date]            │
└─────────────────────────────────────────┘

┌─ Metadata Section (Collapsible) ──────────┐
│ Author: [Value]                            │
│ Publication Year: [Value]                  │
│ Genre: [Value]                            │
│ [Show More/Less Toggle]                   │
└─────────────────────────────────────────┘

┌─ Notes Section (Main Content) ─────────────┐
│ ┌─ Markdown Editor ──────────────────────┐ │
│ │                                        │ │
│ │ [Rich markdown editing area]           │ │
│ │ [Toolbar with basic formatting]        │ │
│ │                                        │ │
│ └────────────────────────────────────────┘ │
│ [Auto-save indicator] [Manual Save Button] │
└─────────────────────────────────────────┘

┌─ Transcript Section (Videos/Podcasts) ────┐
│ [Large textarea for transcript content]   │
│ "Paste transcript here..."                │
└─────────────────────────────────────────┘

┌─ Actions ─────────────────────────────────┐
│ [Share Resource Button]                   │
└─────────────────────────────────────────┘
```

**Key Components:**
- ResourceHeader
- ResourceMetadata (collapsible)
- MarkdownEditor
- TranscriptEditor (conditional)
- ShareButton
- SaveIndicator

### 5. Add New Resource Flow (`/resources/new`)
**Step 1 - Resource Type Selection:**
- Page title: "Add New Resource"
- 4 large, clickable cards for each resource type
- Each card shows icon, type name, and brief description
- Cards arranged in 2x2 grid on desktop

**Step 2 - Resource Form (`/resources/new?type=books`):**
- Form dynamically generated based on resource type
- All fields except title are optional
- Clean, single-column form layout
- "Create Resource" button at bottom
- After creation, immediately redirect to `/resource/[id]` for note-taking

**Key Components:**
- ResourceTypeSelector
- DynamicResourceForm
- FormField components

### 6. Settings Page (`/settings`)
**Sections:**
- Resource Field Configuration
- Share Management (future)
- Account Settings (future)

**Resource Field Configuration:**
- List each resource type
- Show current fields for each type
- Add/Remove field functionality
- Reorder fields (drag-and-drop optional)
- Reset to defaults option

## Mock Data for Development

```typescript
// Sample Resources
const mockResources: Resource[] = [
  {
    id: '1',
    type: 'books',
    metadata: {
      title: 'Atomic Habits',
      author: 'James Clear',
      publicationYear: '2018',
      genre: 'Self-Help',
      description: 'Practical strategies for building good habits'
    },
    notes: '# Key Takeaways\n\n## The Four Laws of Behavior Change\n1. Make it obvious\n2. Make it attractive\n3. Make it easy\n4. Make it satisfying\n\n## Habit Stacking\nAfter [current habit], I will [new habit].',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    type: 'videos',
    metadata: {
      title: 'The Science of Well-Being',
      creator: 'Yale University',
      url: 'https://www.youtube.com/watch?v=xyz',
      duration: '45 minutes',
      platform: 'YouTube',
      description: 'Psychology course on happiness and well-being'
    },
    notes: '# Course Overview\n\nMiswanting - we think we know what makes us happy but we\'re often wrong.\n\n## Key Points:\n- Social connections matter more than we think\n- Gratitude practices actually work\n- Mindfulness reduces stress',
    transcript: 'Welcome to the Science of Well-Being course. Today we\'ll explore what psychology tells us about happiness...',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-12')
  },
  {
    id: '3',
    type: 'podcasts',
    metadata: {
      title: 'Building a Second Brain',
      host: 'Tim Ferriss',
      episodeNumber: '542',
      url: 'https://tim.blog/2024/01/15/tiago-forte/',
      duration: '90 minutes',
      description: 'Interview with Tiago Forte about personal knowledge management'
    },
    notes: '# PARA Method\n\n- **Projects**: Things with deadlines\n- **Areas**: Standards to maintain\n- **Resources**: Future reference\n- **Archives**: Inactive items\n\n## Progressive Summarization\n1. Save content\n2. Bold important passages\n3. Highlight the bold\n4. Executive summary',
    transcript: 'Today\'s guest is Tiago Forte, creator of the Building a Second Brain methodology...',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-08')
  }
];

// Default Resource Type Configurations
const defaultResourceTypes: ResourceType[] = [
  {
    id: 'books',
    name: 'books',
    displayName: 'Books',
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'author', label: 'Author', type: 'text', required: false },
      { name: 'publicationYear', label: 'Publication Year', type: 'text', required: false },
      { name: 'genre', label: 'Genre', type: 'text', required: false },
      { name: 'description', label: 'Description', type: 'textarea', required: false }
    ]
  },
  // Similar for videos, podcasts, short-form
];
```

## Design System & Styling

### Color Palette (Tailwind Classes)
- **Primary**: `bg-blue-600`, `text-blue-600`
- **Secondary**: `bg-gray-100`, `text-gray-600`
- **Success**: `bg-green-500`, `text-green-600`
- **Background**: `bg-gray-50`
- **Text**: `text-gray-900`, `text-gray-600`, `text-gray-400`
- **Borders**: `border-gray-200`, `border-gray-300`

### Typography
- **Headers**: `font-bold text-2xl md:text-3xl text-gray-900`
- **Subheaders**: `font-semibold text-lg text-gray-800`
- **Body**: `text-base text-gray-700 leading-relaxed`
- **Captions**: `text-sm text-gray-500`

### Component Patterns
- **Buttons**: Rounded corners (`rounded-lg`), proper hover states
- **Cards**: Subtle shadows (`shadow-sm hover:shadow-md`), white background
- **Forms**: Clean inputs with focus states, proper spacing
- **Navigation**: Simple, horizontal layout with active states

### Layout Guidelines
- **Max Width**: `max-w-6xl mx-auto` for main content
- **Spacing**: Consistent use of `space-y-6`, `space-y-4` for vertical rhythm
- **Padding**: `px-4 md:px-6 lg:px-8` for responsive horizontal spacing
- **Grid**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` for resource cards

## Key User Flows to Implement

### Flow 1: Create First Resource
1. Dashboard → "Add New Resource" button
2. Select "Books" resource type
3. Fill form (Title: "Atomic Habits", Author: "James Clear")
4. Submit → Redirect to resource page
5. Start typing notes immediately
6. Auto-save works (or manual save)

### Flow 2: Browse and Filter Resources
1. Dashboard → "View All Resources"
2. See list of all resources
3. Click "Books" filter → Only books shown
4. Search "Atomic" → Find specific resource
5. Click resource → Open individual page

### Flow 3: Edit Resource Metadata
1. On resource page → Click "Edit" button
2. Form appears with current values
3. Update title, add description
4. Save changes → Metadata updates immediately

## Phase 1 Implementation Priority

**Essential Components (Build First):**
1. Basic layout and navigation
2. Dashboard with mock data
3. Resource listing page
4. Resource type selection
5. Dynamic resource forms
6. Individual resource pages with markdown editor
7. Local storage persistence

**Nice-to-Have (Phase 2):**
1. Settings page for field configuration
2. Advanced filtering and search
3. Share buttons (UI only, no functionality yet)
4. Auto-save implementation
5. Better loading states

## Success Criteria for Phase 1
- ✅ Can navigate between all main pages
- ✅ Can create new resources of each type
- ✅ Can view and edit individual resources
- ✅ Notes persist in localStorage
- ✅ Filtering and search works on resource listing
- ✅ App feels polished and professional
- ✅ Ready for authentication and database integration

## Additional Implementation Notes

### State Management
Use React Context for:
- Current user state (when auth is added)
- Resource list state
- Resource type configurations

### Error Handling
- Form validation with proper error messages
- Graceful handling of missing resources
- Loading states for all data operations

### Accessibility
- Proper semantic HTML
- Keyboard navigation support
- Screen reader friendly labels
- Focus management

### Performance
- Lazy loading for resource content
- Debounced search functionality
- Optimized re-renders with proper React patterns

This comprehensive foundation will create a polished, functional knowledge vault that can immediately be used for personal note-taking while providing a solid base for adding authentication, database integration, and sharing features in subsequent phases.