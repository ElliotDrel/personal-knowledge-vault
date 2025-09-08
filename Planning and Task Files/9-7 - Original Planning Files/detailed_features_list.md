# Knowledge Vault - Detailed Features List

## Authentication Features

### F1: Magic Link Authentication
- **Description:** Email-based login without passwords
- **User Story:** As a user, I want to log in by entering my email and clicking a link sent to me
- **Implementation:**
  - Email input form on login page
  - Generate secure token and send via email
  - Token validation and session creation
  - Session persistence across browser visits
- **Acceptance Criteria:**
  - User enters email and receives login link within 1 minute
  - Link expires after 15 minutes
  - Successful login creates persistent session
  - Invalid/expired links show appropriate error messages

### F2: Session Management
- **Description:** Maintain user sessions and handle logout
- **Implementation:**
  - Session storage (cookies/local storage)
  - Automatic session validation on page loads
  - Logout functionality
- **Acceptance Criteria:**
  - Sessions persist for 30 days of inactivity
  - Users can manually log out
  - Expired sessions redirect to login

## Resource Management Features

### F3: Resource Type Configuration
- **Description:** Admin can customize fields for each resource type
- **User Story:** As an admin, I want to add/remove fields for each resource type so I can capture the metadata I care about
- **Implementation:**
  - Settings page with resource type management
  - JSON storage of field configurations
  - Dynamic form generation based on configurations
- **Default Fields:**
  - **Books:** Title, Author, Publication Year, Genre, Description
  - **Videos:** Title, Creator, URL, Duration, Platform, Description  
  - **Podcasts:** Title, Host, Episode Number, URL, Duration, Description
  - **Short-form:** Title, Creator, Platform, URL, Description
- **Acceptance Criteria:**
  - Can add new fields with custom names
  - Can remove existing fields
  - Can reorder fields
  - Changes immediately reflect in resource creation forms
  - All field values are text inputs

### F4: Resource Creation
- **Description:** Create new resources with type-specific forms
- **User Story:** As a user, I want to quickly add a new resource and start taking notes immediately
- **Workflow:**
  1. Click "Add New Resource" button
  2. Select resource type (dropdown or button grid)
  3. Fill out form with configured fields
  4. Submit form
  5. Redirect to resource page for note-taking
- **Acceptance Criteria:**
  - Form only shows fields configured for selected type
  - All fields are optional except title
  - Form validation prevents submission without title
  - Successful creation redirects to resource page
  - Resource appears in main listing immediately

### F5: Resource Editing
- **Description:** Edit resource metadata after creation
- **User Story:** As a user, I want to fix typos or update information about a resource
- **Implementation:**
  - "Edit" button on resource pages
  - Modal or inline editing of metadata fields
  - Save/cancel functionality
- **Acceptance Criteria:**
  - Edit button visible to resource owner and editors
  - Changes save immediately or with confirmation
  - Validation prevents removing required title
  - Changes reflect immediately on page

### F6: Resource Listing & Discovery
- **Description:** View and navigate all resources
- **Implementation:**
  - Main resources page with list/grid view
  - Filter by resource type
  - Basic text search across titles and metadata
  - Sort by title, creation date, last modified
- **Acceptance Criteria:**
  - Shows all resources user has access to
  - Filtering works instantly
  - Search finds partial matches in title and description
  - Sorting persists during session
  - Click resource opens individual page

## Note-Taking Features

### F7: Markdown Editor
- **Description:** Simple markdown editing for resource notes
- **User Story:** As a user, I want to write formatted notes using basic markdown
- **Required Markdown Support:**
  - Headers (H1-H6)
  - Bullet points
  - Numbered lists
  - Bold/italic text
  - Code blocks (optional)
- **Implementation:**
  - Use react-md-editor or similar library
  - Live preview or split-pane view
  - Toolbar with common formatting buttons
- **Acceptance Criteria:**
  - Markdown renders correctly in preview
  - Toolbar buttons insert proper markdown syntax
  - Editor handles large documents (10,000+ characters)
  - No advanced features like linking between notes

### F8: Auto-Save / Manual Save
- **Description:** Preserve notes without losing work
- **User Story:** As a user, I want my notes saved automatically so I don't lose work
- **Implementation Options:**
  - **Option A:** Auto-save every 30 seconds
  - **Option B:** Manual save button with unsaved changes indicator
- **Acceptance Criteria:**
  - Notes persist between browser sessions
  - No data loss on browser crashes/closes
  - Save status clearly indicated to user
  - Save conflicts handled gracefully

### F9: Transcript Integration
- **Description:** Add transcripts to video/audio resources
- **User Story:** As a user, I want to paste transcripts for videos so I can reference them later
- **Implementation:**
  - Transcript section at bottom of resource page
  - Large text area for pasting content
  - Part of same document as notes
  - Clear separation from notes section
- **Acceptance Criteria:**
  - Transcript area only appears for video/podcast types
  - Can handle large transcripts (50,000+ characters)
  - Transcript saves with same mechanism as notes
  - Clear visual separation from notes

## Sharing Features

### F10: Individual Resource Sharing
- **Description:** Share specific resources with others
- **User Story:** As a user, I want to share a specific resource with a friend so they can read my notes
- **Workflow:**
  1. Click "Share" button on resource page
  2. Enter recipient email address
  3. Select access level (Viewer/Editor)
  4. Send invitation
  5. Recipient receives email with access link
- **Implementation:**
  - Share modal/form on resource pages
  - Email validation
  - Access level selection
  - Email sending service integration
  - Unique access tokens per share
- **Acceptance Criteria:**
  - Only resource owners can share
  - Email validation prevents invalid addresses
  - Recipients receive email within 5 minutes
  - Access links work for intended recipients only
  - Access level restrictions properly enforced

### F11: Workspace Sharing
- **Description:** Share entire collection with others
- **User Story:** As a user, I want to share my entire knowledge vault with a friend
- **Implementation:**
  - "Share Workspace" button on dashboard
  - Same email + access level flow as individual sharing
  - Recipients get access to all current and future resources
- **Acceptance Criteria:**
  - Recipients see all resources owner has created
  - Access level applies to all resources uniformly
  - New resources automatically shared with workspace recipients
  - Can revoke workspace access

### F12: Access Control
- **Description:** Enforce different permission levels
- **Access Levels:**
  - **Viewer:** Read-only access to resources and notes
  - **Editor:** Full edit permissions (same as owner)
  - **Owner:** Full control including sharing
- **Implementation:**
  - Role-based permission checking
  - UI elements hidden/disabled based on permissions
  - API endpoints validate permissions
- **Acceptance Criteria:**
  - Viewers cannot edit notes or metadata
  - Viewers cannot share resources
  - Editors can modify notes and metadata
  - Editors cannot share resources
  - Permission changes take effect immediately

### F13: Share Management
- **Description:** View and manage who has access to what
- **User Story:** As a user, I want to see who I've shared resources with and revoke access if needed
- **Implementation:**
  - Share management section in settings
  - List of all active shares
  - Revoke access functionality
- **Acceptance Criteria:**
  - Shows all individual and workspace shares
  - Can revoke individual shares
  - Can revoke workspace access
  - Revoked users lose access immediately

## UI/UX Features

### F14: Dashboard
- **Description:** Main landing page after login
- **Elements:**
  - Welcome message
  - "Add New Resource" prominent button
  - "Share Workspace" button
  - Recent resources (last 5)
  - Quick stats (total resources, shares, etc.)
  - Navigation to other sections
- **Acceptance Criteria:**
  - Loads quickly (<2 seconds)
  - Clear call-to-action for main functions
  - Responsive layout (desktop-focused)

### F15: Resource Page Layout
- **Description:** Individual resource viewing/editing page
- **Layout Structure:**
  ```
  [Header with resource title and Edit button]
  [Metadata section - collapsible]
  [Notes section - main content area]
  [Transcript section - bottom, if applicable]
  [Share button - prominent placement]
  ```
- **Acceptance Criteria:**
  - Clean, distraction-free design
  - Clear content hierarchy
  - Share and edit functions easily accessible
  - URL is shareable and bookmarkable

### F16: Settings Page
- **Description:** Configuration and management interface
- **Sections:**
  - Resource field configuration
  - Share management
  - Account settings (email, etc.)
- **Acceptance Criteria:**
  - Organized into clear sections
  - Changes save with confirmation
  - No technical jargon in interface

## Technical Infrastructure Features

### F17: Database Schema
- **Tables:**
  - Users (id, email, created_at, last_login)
  - Resource_types (id, name, field_config)
  - Resources (id, type_id, metadata, notes, transcript, owner_id, created_at, updated_at)
  - Shares (id, resource_id, user_email, access_level, workspace_share, created_at)
  - Sessions (id, user_id, token, expires_at)

### F18: Email Service Integration
- **Requirements:**
  - Send magic link emails
  - Send sharing invitation emails
  - Template-based email system
  - Track delivery status
- **Service Options:**
  - Resend (recommended for simplicity)
  - SendGrid
  - Supabase built-in email

### F19: Storage Management
- **Requirements:**
  - Store all text content in database
  - Future: file upload capability for transcripts
  - Backup strategy for free tier limits
- **Implementation:**
  - Supabase for database and auth
  - Text compression for large notes
  - Regular database size monitoring

## Future Features (Phase 2+)

### F20: Short-form Content API Integration
- **Description:** Automatic download and transcript generation
- **APIs to integrate:**
  - YouTube (shorts)
  - TikTok
  - Instagram (reels)
- **Workflow:**
  1. User pastes content URL
  2. System downloads video
  3. System generates transcript
  4. Both stored as resource attachments

### F21: Export Functionality
- **Description:** Export notes and resources to standard formats
- **Formats:**
  - Individual resources as markdown files
  - Full workspace as ZIP archive
  - PDF export for sharing

### F22: Advanced Search
- **Description:** Search within note content and transcripts
- **Features:**
  - Full-text search
  - Tag system
  - Date range filtering
  - Search within shared content

## Implementation Priority

**Phase 1 (MVP):**
F1, F2, F4, F5, F6, F7, F8, F10, F12, F14, F15, F17, F18

**Phase 2 (Enhanced):**
F3, F9, F11, F13, F16, F19

**Phase 3 (Future):**
F20, F21, F22