# Knowledge Vault Platform - Product Requirements Document

## Project Overview

**Platform Name:** Personal Knowledge Vault  
**Purpose:** A simple, resource-based note-taking and knowledge sharing platform for personal use  
**Target Users:** 5 users maximum (personal + friends)  
**Hosting:** Vercel free tier or similar platform  
**Technical Complexity:** Minimal - designed for non-technical implementation

## Core Concept

A personal knowledge management system that organizes notes around specific resources (books, videos, podcasts, short-form content). Users can take markdown notes on each resource and selectively share individual resources or their entire workspace with others via simple email-based access control.

## User Personas

**Primary User (You):**
- Content creator/note-taker
- Wants to organize knowledge by resource type
- Needs simple sharing capabilities
- Values simplicity over advanced features

**Secondary Users (Friends):**
- Occasional viewers of shared content
- May have editing permissions on specific resources
- Access via email invitation only

## Core Features

### 1. Resource Management

#### Resource Types
- **Books:** Title, Author, Publication Year, Genre, Description
- **Long-form Videos:** Title, Creator/Channel, URL, Duration, Platform, Description
- **Podcasts:** Title, Host, Episode Number, URL, Duration, Description
- **Short-form Content:** Title, Creator, Platform, URL, Description

#### Resource Creation Workflow
1. Click "Add New Resource" button
2. Select resource type from dropdown/buttons
3. Fill out type-specific form with relevant fields
4. Auto-redirect to new resource page for immediate note-taking
5. Auto-save functionality for notes (or manual save if auto-save is complex)

#### Resource Field Configuration
- Settings page allows customization of fields for each resource type
- Add/remove fields per resource type
- All fields are simple text inputs
- Default fields provided but fully customizable

### 2. Note-Taking System

#### Editor Requirements
- Simple markdown editor (headings, bullets, numbered lists, basic formatting)
- No advanced features like linking between notes
- Auto-save or periodic save functionality
- Desktop-optimized interface

#### Resource Page Structure
```
[Resource Metadata Section]
- Title, Author, etc. (editable via "Edit" button)

[Notes Section - Middle]
- Main markdown editing area
- User's personal notes and thoughts

[Transcript Section - Bottom]
- For video/audio content
- Paste-in area for transcripts
- Part of the same file as notes
```

### 3. Authentication System

#### Magic Link Authentication
- Email-only login system
- User enters email address
- System sends login link via email
- Clicking link authenticates browser session
- No passwords, no user registration process
- Session-based authentication

### 4. Sharing System

#### Individual Resource Sharing
- "Share" button on each resource page
- Enter recipient email address
- Choose access level: Viewer or Editor
- System sends email with access link
- Recipients authenticate with their email to access

#### Workspace Sharing
- "Share Workspace" button on main dashboard
- Share entire collection of resources
- Same email + access level selection
- Recipients get viewer or editor access to all resources

#### Access Levels
- **Viewer:** Read-only access to resource and notes
- **Editor:** Full edit permissions (same as creator)
- **Creator/Admin:** Full control including sharing permissions

### 5. Dashboard & Navigation

#### Home Page
- Clean, minimal design
- "Add New Resource" prominent button
- "Share Workspace" button
- Navigation to resource listing
- Access to settings

#### Resource Listing
- View all resources
- Filter by resource type
- Sort options (title, date created, etc.)
- Search functionality (basic text search)
- Click resource to open individual page

#### Settings Page
- Configure resource fields for each type
- Manage sharing permissions
- Basic account settings

## Technical Requirements

### Recommended Tech Stack
- **Frontend:** Next.js (React-based, Vercel-optimized)
- **Database:** Supabase (generous free tier, handles auth)
- **Storage:** Supabase storage for any file attachments
- **Email:** Resend or similar service for authentication/sharing emails
- **Markdown Editor:** React-based markdown editor library (react-md-editor or similar)

### Database Schema (Basic)

```sql
-- Users table
users (
  id, email, created_at, last_login
)

-- Resource types and their fields
resource_types (
  id, name, fields (JSON)
)

-- Individual resources
resources (
  id, type_id, metadata (JSON), notes (TEXT), 
  transcript (TEXT), created_at, updated_at, owner_id
)

-- Sharing permissions
shares (
  id, resource_id, user_email, access_level, 
  created_at, workspace_share (BOOLEAN)
)
```

### URL Structure
- `/` - Home dashboard
- `/resources` - Resource listing
- `/resource/[id]` - Individual resource page
- `/settings` - Configuration page
- `/shared/[token]` - Shared resource access

## Implementation Priorities

### Phase 1 (MVP)
1. Basic authentication system
2. Resource creation with default fields
3. Simple markdown editor
4. Individual resource sharing
5. Basic dashboard

### Phase 2 (Enhancement)
1. Configurable resource fields
2. Workspace sharing
3. Better search and filtering
4. Auto-save functionality

### Phase 3 (Future)
1. Short-form content API integration
2. Advanced markdown features
3. Export functionality

## Success Criteria

- Can create and manage resources easily
- Notes are preserved and accessible
- Sharing works reliably with email authentication
- Platform stays within free tier limits
- Simple enough for non-technical maintenance

## Technical Constraints

- Must work on Vercel free tier
- Database within free tier limits (Supabase: 500MB, 2GB bandwidth)
- Email sending within free limits
- No complex file upload/processing initially
- Desktop-only optimization (no mobile responsive design required)

## Non-Requirements

- Mobile optimization
- Advanced text editing (WYSIWYG)
- Real-time collaboration
- File version history
- Complex user management
- Advanced search/tagging
- Import/export from other platforms initially