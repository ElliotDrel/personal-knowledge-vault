# AI Notes Check System – Features & Functions Specification

## Vision
- Empower users to receive intelligent, actionable feedback on their notes through AI-powered suggestions that identify gaps, improve clarity, and enhance structure.
- Transform note-taking from a passive documentation process into an active learning experience where AI acts as a thoughtful reviewer, not a replacement writer.
- Build a foundation for future AI-assisted knowledge management features while maintaining user agency and preventing over-automation.
- Deliver an experience where AI suggestions feel like thoughtful annotations from a knowledgeable peer rather than intrusive automated edits.

## Scope

### In Scope
- AI-powered note analysis triggered by user action (on-demand, not automatic).
- Claude 4.5 Haiku integration via Anthropic API for cost-effective, fast processing.
- Multiple suggestion types: missing concepts, rewording improvements, factual corrections, and structural recommendations.
- Comment creation in two categories: general comments (broad observations) and selected-text comments (anchored to specific passages).
- Context-aware processing that includes resource metadata (title, description, transcript, etc.) tailored per resource type.
- Intelligent retry logic with AI feedback loops when text matching fails.
- Visual distinction between AI-generated and user-created comments (rainbow gradient borders).
- Comprehensive logging infrastructure for debugging and future analytics.
- Configurable metadata inclusion system that adapts to different resource types (videos, books, articles, short-videos).
- AI Tools overlay interface for future expansion of AI features.
- Character limit enforcement to keep suggestions concise and actionable.
- Duplicate prevention through AI prompt engineering (AI sees existing suggestions).

### Out of Scope
- Automatic note rewriting or direct text modifications by AI.
- Real-time AI analysis while typing (resource-intensive, potentially distracting).
- AI responses to user questions or conversational AI interactions.
- Multi-turn dialogue or clarification requests with AI.
- Custom AI model selection per user (system-wide model only in Phase 1).
- AI-generated tags or metadata extraction (separate future feature).
- Sentiment analysis or tone suggestions.
- AI-powered summarization of notes (separate future feature).
- Multi-language AI processing (English only in Phase 1).
- Cost tracking or usage analytics per user.

## Primary Objectives

1. **Thoughtful Suggestions, Not Rewrites** – AI creates comments as suggestions, never modifies notes directly; user maintains complete control over their content.
2. **Context-Aware Intelligence** – AI receives notes plus relevant metadata (transcript for videos, author for books) to provide informed, specific suggestions.
3. **Precision Text Anchoring** – Selected-text suggestions must match exact text passages with character-perfect accuracy, or retry with AI guidance.
4. **Visual Clarity** – Users instantly recognize AI suggestions through distinctive rainbow borders, maintaining clear authorship distinction.
5. **Future-Ready Architecture** – Infrastructure supports multiple AI tools (not just notes check), different models, and evolving suggestion types.

## System Goals

- **User Agency** – AI augments, never replaces; every suggestion requires explicit user action to apply.
- **Transparency** – Users know when AI is working, what it's analyzing, and when processing completes or fails.
- **Cost Efficiency** – Claude 4.5 Haiku provides fast, affordable processing suitable for frequent use.
- **Reliability** – Robust retry mechanisms handle edge cases (ambiguous text, API failures) gracefully.
- **Extensibility** – Configuration-driven design allows easy addition of new resource types, models, or suggestion types.
- **Debugging Support** – Detailed logging (function logs + database) enables troubleshooting and improvement iteration.

## The Problem We're Solving

### Current Pain Points
- **Incomplete Notes**: Users capture information but may miss important concepts, connections, or context from source material.
- **Clarity Issues**: Notes make sense in the moment but become unclear when reviewed later; phrasing may be ambiguous or overly terse.
- **Structural Weaknesses**: Information captured but not organized effectively; key insights buried or poorly categorized.
- **Passive Consumption**: Users watch videos or read books without actively engaging with material through reflection or revision.
- **No Feedback Loop**: Unlike collaborative documents, personal notes receive no external review or constructive feedback.

### Why This Matters
- **Knowledge Retention**: Research shows active engagement (like revising based on feedback) significantly improves long-term retention.
- **Learning Acceleration**: Identifying gaps and refining understanding accelerates learning compared to passive note-taking.
- **Future Reference Value**: Well-structured, complete notes become more valuable as reference material over time.
- **Metacognition Development**: AI feedback helps users recognize patterns in their thinking and note-taking habits.

### Why AI for This Task
- **Scale**: AI can review notes in seconds, providing feedback that would otherwise never happen due to time constraints.
- **Consistency**: AI applies same analytical framework across all notes, identifying patterns humans might miss.
- **Objectivity**: AI suggests improvements without judgment or ego, encouraging experimentation.
- **Context Integration**: AI can cross-reference notes with source material (transcripts, descriptions) humans might not reread.

## Target Data Model

### TypeScript Interfaces

```typescript
// AI Processing Logs (General-Purpose Table)
export interface AIProcessingLog {
  id: string;
  parentLogId?: string; // For retry chains
  userId: string;
  resourceId?: string; // Nullable for future non-resource AI tasks
  actionType: string; // 'notes_check', 'summary_generation', etc.
  attemptNumber: number; // 1 = initial, 2+ = retries
  status: 'processing' | 'completed' | 'failed' | 'partial_success';
  modelUsed: string; // e.g., 'anthropic/claude-4-5-haiku'
  inputData?: Record<string, any>; // Flexible JSONB
  outputData?: Record<string, any>; // Flexible JSONB
  errorDetails?: Record<string, any>; // Flexible JSONB
  processingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
}

// Enhanced Comment Interface (Extends Existing)
export interface Comment {
  // ... existing fields (id, resourceId, userId, body, etc.)

  // AI-specific fields
  createdByAi: boolean;
  aiCommentCategory?: 'general' | 'selected_text';
  aiSuggestionType?: 'missing_concept' | 'rewording' | 'factual_correction' | 'structural_suggestion';
  aiProcessingLogId?: string; // Links to detailed processing info
  retryCount: number; // How many attempts to create this comment
}

// AI Configuration
export interface AIConfig {
  model: string;
  maxCommentLength: number;
  minSelectedTextLength: number;
  maxRetryAttempts: number;
  maxCommentsPerRun: number;
  systemPrompt: string;
  jsonSchemaInstructions: string;
}

// AI Comment Suggestion (API Response Shape)
export interface AICommentSuggestion {
  category: 'general' | 'selected_text';
  suggestionType: 'missing_concept' | 'rewording' | 'factual_correction' | 'structural_suggestion';
  body: string; // Max 200 characters
  selectedText: string | null; // Exact text from notes (required if category=selected_text)
}

// Metadata Configuration (Per Resource Type)
export type ResourceType = 'video' | 'short-video' | 'book' | 'article';

export const AI_METADATA_CONFIG: Record<ResourceType, string[]> = {
  'short-video': ['author', 'description', 'transcript'],
  'video': ['title', 'description', 'transcript', 'author'],
  'book': ['title', 'description', 'author'],
  'article': ['title', 'url'],
};
```

### Database Schema Additions

**New Table: `ai_processing_logs`**
- Purpose: Track all AI operations (not just notes check) for debugging, analytics, and retry chains
- Key fields:
  - `parent_log_id`: Links retry attempts to original processing run
  - `action_type`: Discriminator for different AI features ('notes_check', future: 'summarize', 'extract_concepts')
  - `input_data`, `output_data`, `error_details`: Flexible JSONB for feature-specific data
  - `status`: Tracks lifecycle (processing → completed/failed/partial_success)
  - `model_used`: Records which AI model processed the request (for A/B testing, cost tracking)

**Enhanced Table: `comments`**
- New AI-specific columns:
  - `created_by_ai`: Boolean flag for filtering and visual styling
  - `ai_comment_category`: Whether comment is general or anchored to text
  - `ai_suggestion_type`: Categorizes the type of suggestion (missing_concept, rewording, etc.)
  - `ai_processing_log_id`: Foreign key to detailed processing log
  - `retry_count`: Tracks how many attempts were needed (debugging metric)
- Constraint: When `created_by_ai = true`, category and suggestion type must be non-null

## AI Suggestion Taxonomy

### Suggestion Types Explained

**1. Missing Concept**
- **Purpose**: Identify important topics, ideas, or context from source material not captured in notes.
- **Example**: "Consider adding information about the historical context mentioned at 2:34 in the video."
- **When AI uses this**: Notes exist but lack coverage of key concepts present in transcript/description.
- **User action**: Expand notes with missing information.

**2. Rewording**
- **Purpose**: Suggest clearer, more precise, or more concise phrasing for existing notes.
- **Example**: "This could be phrased more clearly: 'Economic factors drove change' → 'Inflation and unemployment drove policy changes.'"
- **When AI uses this**: Notes are accurate but unclear, ambiguous, or overly verbose.
- **User action**: Revise selected text with improved phrasing.

**3. Factual Correction**
- **Purpose**: Flag potential inaccuracies by comparing notes against source material.
- **Example**: "The video states this event occurred in 1995, not 1993 as written here."
- **When AI uses this**: Discrepancy detected between notes and source transcript/description.
- **User action**: Verify and correct if needed.

**4. Structural Suggestion**
- **Purpose**: Recommend better organization, formatting, or logical flow.
- **Example**: "Consider organizing these points chronologically rather than by topic."
- **When AI uses this**: Notes are complete but structure could improve readability or future reference value.
- **User action**: Reorganize notes according to suggestion.

### Comment Categories Explained

**General Comments**
- Not anchored to specific text location
- Used for:
  - Overall structural feedback
  - High-level observations about completeness
  - Suggestions that apply to entire note set
- Examples:
  - "Consider adding a summary section at the top."
  - "The main argument could be stated more prominently."
  - "Missing connection to other concepts you've noted in related resources."

**Selected-Text Comments**
- Anchored to specific character ranges in notes (startOffset, endOffset)
- Visual highlight appears in editor (linked to comment)
- Used for:
  - Specific rewording suggestions
  - Factual corrections of particular statements
  - Missing concepts that should go in specific location
- Examples:
  - "This conclusion needs more support from the earlier examples."
  - "Consider expanding this definition to include edge cases."
  - "The phrasing here is ambiguous—clarify which 'system' you're referring to."

## User Experience Flow

### Entry Point: AI Tools Overlay

**Visual Design**:
- Fixed-position floating button in bottom-right of NotesEditorDialog
- Icon: Sparkles/stars (✨) in circular button with subtle shadow
- Hover effect: Slight scale and shadow expansion
- Badge indicator if AI processing active ("Working..." badge on button)

**Behavior**:
- Click button → overlay expands upward from button position
- Overlay shows available AI tools (currently only "AI Notes Check")
- Future tools will appear as additional cards in scrollable list
- Click outside or click button again → overlay closes (toggle behavior)
- Overlay persists across note edits (position fixed within dialog)

**Why This Design**:
- Familiar pattern (similar to ChatGPT/assistant interfaces)
- Non-intrusive (out of way until needed)
- Future-ready (easy to add new tools)
- Clear affordance (sparkles universally signify AI features)

### AI Notes Check Flow

**Stage 1: Idle State**
- AI Tools button visible but overlay closed
- No processing active
- User clicks button → overlay opens showing "AI Notes Check" card

**Stage 2: Initiation**
- User clicks "AI Notes Check" button in overlay
- Immediate feedback: Button disabled, spinner appears
- Progress indicator initializes: "Preparing analysis..."
- Backend: Frontend calls Edge Function to create processing job

**Stage 3: Analyzing (0-2 seconds)**
- Progress message: "Analyzing your notes and metadata..."
- Visual: Linear progress bar (indeterminate animation)
- Backend: Edge Function gathering context (notes, comments, metadata)
- Backend: Building prompt with resource-specific metadata

**Stage 4: Generating (2-5 seconds)**
- Progress message: "Generating improvement suggestions..."
- Visual: Progress bar continues (still indeterminate)
- Backend: Anthropic API call to Claude 4.5 Haiku
- Backend: Parsing JSON response, validating schema

**Stage 5: Creating (5-7 seconds)**
- Progress message: "Creating comments in your sidebar..."
- Visual: Progress bar continues
- Backend: Processing each suggestion:
  - For selected-text: Exact text matching (retry if fails)
  - Creating comment records in database
  - Linking to processing log
- Frontend: Polling for status updates

**Stage 6: Complete (7+ seconds)**
- Progress message: "✓ AI review complete! [N] suggestions added."
- Visual: Success checkmark, green accent
- Comments appear in sidebar with rainbow borders
- Overlay auto-closes after 2 seconds (or user closes manually)
- Comment sidebar refreshes to show new AI suggestions

**Stage 7: Error Handling**
- If failure occurs: "Something went wrong. Please try again."
- Error details logged but not shown to user (avoid technical jargon)
- "Try Again" button appears to restart process
- Partial success: "Created [N] suggestions. Some suggestions couldn't be created."

### Progress Stage Justification

**Why specific messages at each stage?**
- **Transparency**: Users know AI isn't a black box; they see what's happening.
- **Perceived Performance**: Specific messages make wait feel shorter than generic "Loading...".
- **Trust Building**: Users understand the process (analysis → generation → creation) builds confidence.
- **Error Context**: If failure occurs at specific stage, users and developers know where problem occurred.

**Why 1-2 second transitions?**
- Some stages complete faster than others (unpredictable API latency)
- Minimum display time prevents message flickering
- Creates smooth, readable progression rather than jarring jumps

## AI Prompt Engineering

### Prompt Design Philosophy

**Clarity Over Creativity**
- AI must follow strict JSON schema and character limits
- No room for artistic interpretation; precision is paramount
- Instructions written as commands, not suggestions

**Context Over Instruction Volume**
- Provide rich context (notes + metadata) rather than lengthy instructions
- Let AI infer appropriate suggestions from quality source material
- Avoid over-constraining creativity (e.g., "you must create 5 suggestions")

**Examples Over Explanations**
- Where possible, show AI what good suggestions look like
- Few-shot examples more effective than abstract guidelines

### Prompt Structure

**System Prompt Components**:
1. **Role Definition**: "You are an AI assistant helping users improve their notes."
2. **Task Description**: "Analyze the provided notes and metadata, then suggest improvements as comments."
3. **Output Constraints**: "Concise (max 200 characters), actionable, specific, focused on substance."
4. **Category Guidance**:
   - General: Broad observations not tied to specific text
   - Selected-Text: Suggestions for specific passages (must provide exact text)
5. **Suggestion Type Guidance**:
   - Missing Concept: Important topics not covered
   - Rewording: Clearer/better phrasing for existing text
   - Factual Correction: Potential inaccuracies
   - Structural Suggestion: Better organization
6. **Critical Rules**:
   - Exact character-for-character text matching for selected_text
   - If text appears multiple times, expand selection to make unique
   - Minimum 5 characters for selected text
   - No duplicates of existing AI comments
   - Maximum 20 comments per run
7. **JSON Schema**: Exact structure AI must return

**User Prompt Components**:
1. **Notes**: Full markdown text of user's current notes
2. **Metadata**: Resource-specific fields (title, transcript, etc.)
3. **Existing AI Comments**: List of active AI suggestions (to prevent duplicates)
4. **Instruction**: "Analyze these notes and provide improvement suggestions as JSON comments."

### Handling AI Non-Compliance

**Text Matching Failures**:
- **Problem**: AI suggests selecting text that doesn't exist or appears multiple times
- **Solution**: Send feedback to AI: "Text '[selected_text]' not found or ambiguous. Expand selection to make unique or choose different text."
- **Retry Limit**: 3 attempts per comment, then skip

**Schema Violations**:
- **Problem**: AI returns malformed JSON or missing required fields
- **Solution**: Log error, skip comment, continue processing others
- **No Retry**: Schema errors indicate prompt/model issue, not transient failure

**Character Limit Violations**:
- **Problem**: AI writes comment body exceeding 200 characters
- **Solution**: Truncate to 197 characters + "..." suffix, log warning
- **Future Enhancement**: Send feedback to AI asking to shorten

## Visual Design & Styling

### AI Comment Styling

**Rainbow Gradient Border**:
- Purpose: Instantly distinguish AI suggestions from user comments
- Implementation: CSS gradient border with multiple color stops
- Colors: Purple → Pink → Blue spectrum (vibrant, AI-themed)
- Animation: Subtle gradient rotation on hover (optional polish)

**Example CSS**:
```css
.ai-comment-border {
  border: 2px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%) border-box;
}
```

**Why Rainbow Gradient?**
- Distinctive: Impossible to confuse with user comments (standard gray borders)
- On-Brand: Rainbow/gradient aesthetic widely associated with AI features
- Fun: Makes AI suggestions feel like exciting enhancements, not corrections
- Accessible: High contrast maintained, works in light and dark modes

**AI Badge** (Optional Enhancement):
- Small "AI" badge in top-right of comment card
- Icon: Sparkles or robot icon
- Tooltip: "This suggestion was created by AI"

### AI Tools Overlay Styling

**Container**:
- Width: 320px (matches comment sidebar width for consistency)
- Max height: 400px (scrollable if many tools added)
- Background: Card background with subtle shadow
- Border radius: 12px (rounded, friendly)
- Position: Fixed, bottom-right of NotesEditorDialog (24px margins)

**Tool Cards**:
- Each tool is a clickable card within overlay
- Hover: Subtle background color change, slight shadow increase
- Active: Blue border indicating current tool running
- Disabled: Grayed out with spinner if tool already running

**Progress Display**:
- Linear progress bar (indeterminate during processing)
- Stage text (e.g., "Analyzing your notes...")
- Icon matching current stage (magnifying glass → sparkles → checkmark)

### Interaction States

**Button States**:
- **Default**: Sparkles icon, neutral color, slight shadow
- **Hover**: Scale 1.05, shadow expands, color brightens
- **Active**: Pressed appearance, scale 0.98
- **Processing**: Spinner badge on button, button disabled

**Overlay States**:
- **Closed**: Invisible, not in DOM or positioned off-screen
- **Opening**: Slide-up animation (200ms ease-out)
- **Open**: Fully visible, clickable
- **Closing**: Slide-down animation (150ms ease-in)

## Technical Architecture

### Component Structure

**New Components**:
1. **`AIToolsOverlay.tsx`**: Main container for AI features
   - Manages overlay open/close state
   - Renders available tool cards
   - Handles tool selection and activation
   - Displays progress for active tool

2. **`AINotesCheckTool.tsx`** (within overlay): Specific tool for notes checking
   - Initiates Edge Function call
   - Polls for status updates
   - Displays stage-specific progress messages
   - Handles completion/error states

3. **`AICommentCard.tsx`** (enhanced `CommentCard`): Renders AI comments
   - Applies rainbow border styling when `createdByAi = true`
   - Shows suggestion type badge
   - Same interaction as user comments (resolve, delete)

**Modified Components**:
1. **`NotesEditorDialog.tsx`**: Hosts AI Tools overlay
   - Adds AI Tools button in fixed position
   - Passes resourceId and currentNotes to overlay
   - Handles comment refresh after AI processing

2. **`CommentSidebar.tsx`**: Displays AI comments alongside user comments
   - No functional changes (AI comments use same data structure)
   - Visual distinction handled by CommentCard component

### Edge Function Architecture

**Function: `ai-notes-check`**

**Responsibilities**:
1. Authenticate user and fetch resource
2. Gather context (notes, metadata, existing AI comments)
3. Call Anthropic API with constructed prompt
4. Parse and validate JSON response
5. Process each suggestion (text matching + retry logic)
6. Create comment records in database
7. Update processing log with results
8. Return summary to frontend

**Error Handling**:
- API rate limits: Return 429 status, include retry-after header
- Malformed JSON: Log error, skip comment, continue processing
- Text match failures: Retry with AI feedback (max 3 attempts)
- Network timeouts: Return 504 status, processing log marked failed
- Partial success: Create comments that succeeded, return summary with warnings

**Logging Strategy**:
- **Function Logs** (verbose, expires in 7 days):
  - Every API call (request/response size, latency)
  - Text matching attempts and results
  - Retry feedback sent to AI
  - Token usage and costs
- **Database Logs** (structured, permanent):
  - High-level status (processing → completed/failed)
  - Summary statistics (N comments created, N failed)
  - Critical errors (API key issues, schema violations)
  - Processing time (for performance monitoring)

**Performance Targets**:
- Total processing time: <10 seconds for typical notes (500-2000 words)
- API call latency: <3 seconds (Claude 4.5 Haiku is fast)
- Text matching: <100ms per comment (simple string search)
- Database operations: <1 second total (batched inserts where possible)

### Configuration System

**File: `src/config/aiConfig.ts`**
- Centralized constants (model, character limits, retry attempts)
- System prompt and JSON schema instructions
- Easy to update without hunting through codebase

**File: `src/config/aiMetadataConfig.ts`**
- Maps resource types to metadata fields
- Simple object literal (no database needed for MVP)
- Future: Could move to database for per-user customization

**Why Configuration Files?**
- Single source of truth (no magic numbers)
- Easy experimentation (change model, see results)
- Type-safe (TypeScript enforces structure)
- Version controlled (track prompt evolution)

### Storage Adapter Methods

**New Methods**:
1. **`getActiveAIComments(resourceId, userId)`**: Fetch unresolved AI comments (for context)
2. **`createAIProcessingLog(log)`**: Start processing log entry
3. **`updateAIProcessingLog(logId, updates)`**: Update log with results
4. **`createAIComment(comment)`**: Create comment with AI-specific fields populated

**Why New Methods?**
- Explicit AI operations vs. generic comment operations
- Type safety (enforces required AI fields)
- Future enhancement: Could track AI vs. user comment metrics separately

## Retry Logic & Text Matching

### The Text Matching Challenge

**Problem**: AI suggests selecting text that may not exist exactly in notes due to:
- Typos in AI's transcription of user notes
- Paraphrasing instead of quoting
- Ambiguous references (text appears multiple times)
- User edited notes between AI analysis and comment creation

**Solution**: Three-attempt retry with AI feedback

### Retry Flow

**Attempt 1**: Direct match
- Search notes for exact selectedText string
- If found once: Success (calculate offsets, create comment)
- If not found or multiple matches: Proceed to Attempt 2

**Attempt 2**: AI feedback (first retry)
- Send feedback to AI: "Text '[selected_text]' not found or appears [N] times. Expand selection to make unique."
- AI returns revised selectedText (hopefully more unique)
- Repeat matching logic
- If found once: Success (create comment with retryCount=1)
- If still fails: Proceed to Attempt 3

**Attempt 3**: AI feedback (second retry)
- Send stronger feedback: "Text still ambiguous. Provide more context or choose different passage."
- AI returns revised selectedText
- Repeat matching logic
- If found once: Success (create comment with retryCount=2)
- If still fails: Give up, log error, skip this comment

**After Attempt 3 Failure**:
- Log to database: `errorDetails: { reason: 'text_match_failed_max_retries', attemptedTexts: [...] }`
- Log to function: Detailed error with full attempted texts
- Continue processing other comments (don't fail entire run)

### Minimum Text Length Enforcement

**Rule**: selectedText must be ≥ 5 characters

**Rationale**:
- Very short selections (1-4 chars) almost always ambiguous
- Prevents AI from selecting single words or punctuation
- Forces AI to provide meaningful context

**Enforcement**:
- Validated in Edge Function before matching
- If violated: Skip comment, log warning
- Included in prompt instructions to prevent

### Handling Multiple Matches

**Example Scenario**:
- User notes contain: "The key factor is timing. [...] The key factor is cost."
- AI suggests selecting: "The key factor"
- Search finds 2 matches (ambiguous)

**Resolution**:
- Feedback to AI: "Text 'The key factor' appears 2 times. Expand to unique passage."
- AI revision: "The key factor is timing" (unique)
- Success: Create comment at first occurrence

**Edge Case**: User notes have actual duplicates
- Some passages legitimately appear twice (copy-paste, repetition)
- If AI can't make unique after 3 tries: Skip comment
- User can manually create comment if needed

## Security & Privacy Considerations

### API Key Management

**Anthropic API Key**:
- Stored in Supabase Secrets (never in code or environment variables exposed to client)
- Accessed only by Edge Function (server-side)
- Rotatable without code changes

**Command**:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=<your-key>
```

### Data Privacy

**What AI Sees**:
- User's notes (markdown text)
- Resource metadata (title, description, transcript, author)
- Existing AI comment text (to avoid duplicates)

**What AI Doesn't See**:
- User identity (no names, emails, user IDs sent to Anthropic)
- Other user comments (only AI comments for context)
- Other resources' notes (isolated per resource)
- Any PII beyond what user explicitly wrote in notes

**Anthropic API Policy**:
- Check Anthropic data retention policy
- Ensure compliance with privacy policy
- Consider adding user consent notice

### Rate Limiting & Abuse Prevention

**Current Approach**: Trust users (no hard limits in Phase 1)

**Future Enhancements**:
- Per-user rate limit (e.g., 10 AI checks per day)
- Cooldown period between runs (e.g., 30 seconds)
- Cost tracking and alerts if user exceeds budget

**Why No Limits Initially?**
- Small user base (low abuse risk)
- Want feedback on usage patterns first
- Can add limits later if needed

### RLS Policies

**`ai_processing_logs` Table**:
- Users can SELECT their own logs (view history)
- Service role can INSERT logs (Edge Function creates)
- Service role can UPDATE logs (Edge Function updates status)
- Users cannot DELETE logs (audit trail)

**`comments` Table** (existing policies extended):
- AI comments follow same RLS as user comments
- User can resolve, delete their AI comments (same permissions)

## Testing & Validation

### Manual Test Scenarios

**Happy Path**:
1. Open NotesEditorDialog with notes >100 words
2. Click AI Tools button → overlay opens
3. Click "AI Notes Check" → processing begins
4. Verify stage messages display correctly
5. Wait for completion (should be <10 seconds)
6. Verify AI comments appear in sidebar with rainbow borders
7. Verify comment bodies are ≤200 characters
8. Verify selected-text comments have valid offsets (click to highlight)
9. Resolve an AI comment → verify it moves to resolved
10. Delete an AI comment → verify it's removed

**Empty Notes**:
1. Open NotesEditorDialog with empty or very short notes (<50 words)
2. Click AI Tools button → run AI check
3. AI should create general comment: "Consider adding more detailed notes." (or similar)

**Retry Scenario** (harder to test manually):
1. Manually trigger Edge Function with notes + deliberately wrong selectedText
2. Verify function logs show retry attempts
3. Verify retryCount incremented in database
4. Verify comment created after successful retry

**Error Handling**:
1. Temporarily revoke Anthropic API key
2. Run AI check → verify friendly error message shown
3. Verify processing log marked as 'failed'
4. Restore API key, try again → verify works

**Duplicate Prevention**:
1. Run AI check → creates N comments
2. Immediately run AI check again (without editing notes)
3. Verify AI does not create duplicate suggestions
4. Verify new run completes quickly (AI sees no new work needed)

### Database Validation Queries

**After successful AI check**:
```sql
-- Verify comments created correctly
SELECT
  id,
  body,
  created_by_ai,
  ai_comment_category,
  ai_suggestion_type,
  LENGTH(body) as body_length,
  retry_count
FROM comments
WHERE resource_id = '<test-resource-id>'
  AND created_by_ai = true
ORDER BY created_at DESC;

-- Verify processing log recorded
SELECT
  id,
  status,
  model_used,
  attempt_number,
  output_data->>'comments_created' as comments_created,
  processing_time_ms
FROM ai_processing_logs
WHERE resource_id = '<test-resource-id>'
ORDER BY created_at DESC
LIMIT 5;

-- Verify retry chains linked correctly
SELECT
  id,
  parent_log_id,
  attempt_number,
  status,
  error_details->>'failed_text_matches' as failed_matches
FROM ai_processing_logs
WHERE parent_log_id IS NOT NULL
ORDER BY created_at DESC;
```

### Performance Validation

**Benchmarks**:
- Notes (500 words) + transcript (2000 words): <8 seconds end-to-end
- Notes (2000 words) + transcript (5000 words): <12 seconds end-to-end
- Empty notes: <5 seconds (AI creates 1-2 general comments)

**If Performance Degrades**:
1. Check Anthropic API latency (log shows per-call timing)
2. Check text matching performance (should be <100ms total)
3. Check database query performance (indexes on comments, logs tables)

### Build & Quality Checks

**Before Deployment**:
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No TypeScript errors
- [ ] Database migrations applied: `npx supabase db push`
- [ ] Types regenerated: `npx supabase gen types typescript --linked`
- [ ] Edge function deployed: `npx supabase functions deploy ai-notes-check`
- [ ] Anthropic API key set: `npx supabase secrets set ANTHROPIC_API_KEY=...`

## Future Enhancements

### Priority 1: Model Selection
- Allow users (or admin) to switch AI models (GPT-4, Claude Opus, Gemini)
- Compare suggestion quality across models
- A/B test different models for different suggestion types

### Priority 2: Custom Prompts
- Users can edit system prompt or add custom instructions
- Example: "Focus on historical context" or "Check for logical fallacies"
- Saved per user or per resource type

### Priority 3: Suggestion Acceptance Tracking
- Track which AI suggestions users apply vs. ignore
- Feed data back to improve prompt engineering
- Show users their acceptance rate (gamification)

### Priority 4: Batch Processing
- Run AI check across multiple resources
- Example: "Review all video notes from last week"
- Dashboard showing resources with pending AI suggestions

### Priority 5: Real-Time Suggestions
- AI suggests as user types (debounced)
- Inline suggestions (like Grammarly)
- Requires streaming API support, careful UX design

### Priority 6: AI Summary Mode
- AI generates summary of notes (separate from suggestions)
- Creates new "Summary" section in notes
- Can be regenerated if notes change

### Priority 7: Cross-Resource Insights
- AI compares notes across multiple resources
- Suggests connections: "This relates to concept in Resource X"
- Requires vector embeddings or semantic search

### Priority 8: Cost Tracking & Budgets
- Track Anthropic API costs per user
- Set monthly budgets, notify if approaching limit
- Display cost estimate before running AI check

## Success Metrics

### User Engagement
- **Adoption Rate**: % of users who try AI Notes Check within first week
- **Repeat Usage**: % of users who use feature >3 times
- **Suggestion Acceptance**: % of AI comments resolved (implies applied)
- **Time to First Use**: Days from account creation to first AI check

### Technical Performance
- **Success Rate**: % of AI check runs that complete without errors
- **Processing Time**: P50, P95, P99 latencies
- **Retry Rate**: % of comments requiring retries (lower is better)
- **Partial Failure Rate**: % of runs where some comments fail

### Content Quality
- **Suggestion Length**: Distribution of comment body lengths (target: 100-200 chars)
- **Suggestion Type Distribution**: % of each suggestion type (balanced?)
- **Duplicate Rate**: % of runs where AI creates duplicate suggestions (target: <5%)

### Cost Efficiency
- **Cost Per Check**: Average Anthropic API cost per AI check
- **Tokens Per Check**: Average tokens sent/received (optimize prompt if high)
- **Failed Token Spend**: Tokens wasted on failed runs (minimize retries)

## Deliverables Checklist

### Database
- [ ] `ai_processing_logs` table migration created
- [ ] `comments` table updates migration created (AI fields)
- [ ] RLS policies migration for `ai_processing_logs`
- [ ] Indexes created for performance
- [ ] Validation queries tested

### Configuration
- [ ] `src/config/aiConfig.ts` created with all constants
- [ ] `src/config/aiMetadataConfig.ts` created with resource type mappings
- [ ] System prompt finalized and reviewed
- [ ] JSON schema instructions finalized

### Edge Function
- [ ] `supabase/functions/ai-notes-check/index.ts` implemented
- [ ] Anthropic API integration tested
- [ ] Retry logic with AI feedback implemented
- [ ] Text matching algorithm implemented
- [ ] Detailed logging added (function + database)
- [ ] Error handling for all edge cases
- [ ] Deployed and tested: `npx supabase functions deploy ai-notes-check`

### Storage Adapter
- [ ] `getActiveAIComments` method added
- [ ] `createAIProcessingLog` method added
- [ ] `updateAIProcessingLog` method added
- [ ] `createAIComment` method added
- [ ] TypeScript types updated

### Components
- [ ] `AIToolsOverlay.tsx` created (main container)
- [ ] `AINotesCheckTool.tsx` created (specific tool)
- [ ] `CommentCard.tsx` enhanced with rainbow border styling
- [ ] `NotesEditorDialog.tsx` integration (AI Tools button + overlay)
- [ ] Progress stages implemented with smooth transitions
- [ ] Error states and retry UI implemented

### Styling
- [ ] Rainbow gradient border CSS added
- [ ] AI Tools overlay styling completed
- [ ] Responsive design tested (desktop, tablet, mobile)
- [ ] Dark mode compatibility verified
- [ ] Accessibility (contrast, focus states) verified

### Testing
- [ ] Manual test scenarios completed (happy path, errors, retries)
- [ ] Database validation queries run
- [ ] Performance benchmarks measured
- [ ] Build and lint checks passed
- [ ] Edge cases tested (empty notes, long notes, duplicate runs)

### Documentation
- [ ] Feature specification (this document) completed
- [ ] Implementation plan created
- [ ] CLAUDE.md updated with AI comment patterns
- [ ] Code comments added for complex logic (retry, text matching)

### Deployment
- [ ] Database migrations applied to production
- [ ] Edge function deployed to production
- [ ] Anthropic API key configured in production
- [ ] Frontend deployed (Vercel auto-deploy)
- [ ] Smoke test passed in production

---

## Summary

**Feature**: AI-powered note review system that analyzes user notes and creates improvement suggestions as comments, with intelligent text anchoring, retry logic, and distinctive visual styling.

**Purpose**: Transform note-taking from passive documentation to active learning by providing thoughtful, actionable feedback that helps users improve coverage, clarity, and structure.

**Approach**: On-demand AI processing (user-initiated) via Claude 4.5 Haiku through Anthropic API, with context-aware prompts including resource-specific metadata, exact character-matching for selected-text suggestions, and robust retry mechanisms for reliability.

**Impact**:
- **User Experience**: Adds intelligent feedback loop to solitary note-taking; encourages reflection and revision without intrusive automation.
- **Technical Debt**: Minimal (clean separation of concerns, reuses existing comment system, future-proof logging infrastructure).
- **Performance**: Fast (Claude 4.5 Haiku is optimized for speed; <10 seconds typical processing time).
- **Reliability**: High (graceful degradation with retry logic, detailed logging for debugging, partial success handling).
- **Cost**: Low (Haiku is cost-effective; ~$0.01-0.05 per check depending on note length).

**User Value**: Very High (fills gap in solitary learning workflow; provides feedback that would otherwise never happen; improves retention and understanding through active engagement).

**Risk Level**: Medium (new AI integration, prompt engineering required, text matching complexity, API dependency).

**Dependencies**: Anthropic API account, Claude 4.5 Haiku model access, Supabase Edge Functions, existing comment system.

**Estimated Effort**: 16-20 hours across 4 focused implementation sprints.

---

*Document Version: 1.0*
*Created: 2025-10-16*
*Status: Ready for Implementation*
