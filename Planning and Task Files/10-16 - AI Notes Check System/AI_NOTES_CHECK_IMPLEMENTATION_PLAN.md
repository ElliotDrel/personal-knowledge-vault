# AI Notes Check System – Implementation Plan

## Overview & Strategy

- **Goal**: Implement AI-powered note review system that analyzes user notes and creates improvement suggestions as comments, with intelligent text anchoring, retry logic, and distinctive visual styling.
- **Approach**: Backend-first Edge Function processing with OpenRouter API integration, followed by frontend overlay UI and visual enhancements; leverage existing comment system infrastructure with AI-specific extensions.
- **Guiding principles**: User agency (suggestions not rewrites), transparency (visible progress), cost efficiency (Claude 3.5 Haiku), reliability (retry mechanisms), extensibility (config-driven design), debugging support (detailed logging).

## Current Status (2025-10-16)

**STATUS**: Ready for implementation. Feature specification complete, technical decisions finalized, implementation path validated.

### Project Context
- **Base Feature**: Notes commenting system fully implemented (Phases 0-8 complete from 10-10)
- **Storage Layer**: Supabase storage adapter operational with comment CRUD
- **UI Framework**: shadcn/ui components, NotesEditorDialog with markdown editing
- **Comment Infrastructure**: `comments` table with text anchoring, CommentSidebar/CommentCard/CommentToolbar components functional

### Prerequisites Verified
- [x] Notes commenting system operational
- [x] OpenRouter account created (API key ready for configuration)
- [x] Supabase Edge Functions working (tested with existing functions)
- [x] Comment system supports additional fields (extensible schema)
- [x] TypeScript strict mode enabled
- [ ] OpenRouter API key configured in Supabase secrets (Phase 2)

## Phases & Timeline

| Phase | Focus | Duration | Status | Priority |
|-------|-------|----------|--------|----------|
| 0 | Database schema & migrations | 2-3 hours | ❌ PENDING | CRITICAL |
| 1 | Configuration system | 1-2 hours | ❌ PENDING | CRITICAL |
| 2 | Edge Function implementation | 4-6 hours | ❌ PENDING | CRITICAL |
| 3 | Storage adapter methods | 2-3 hours | ❌ PENDING | HIGH |
| 4 | AI Tools overlay UI | 3-4 hours | ❌ PENDING | HIGH |
| 5 | Comment styling (rainbow borders) | 1-2 hours | ❌ PENDING | MEDIUM |
| 6 | NotesEditorDialog integration | 2-3 hours | ❌ PENDING | HIGH |
| 7 | Testing & validation | 3-4 hours | ❌ PENDING | CRITICAL |
| 8 | Deployment & monitoring | 1-2 hours | ❌ PENDING | MEDIUM |
| **TOTAL** | **Full implementation** | **~20-30 hours** | | **~3-4 days** |

---

## Phase 0 – Database Schema & Migrations (2-3 hours) ❌ CRITICAL

### Objective
Create `ai_processing_logs` table for general-purpose AI operations and extend `comments` table with AI-specific fields.

### Prerequisites
- [ ] Working tree clean (commit pending changes)
- [ ] Supabase CLI linked to project
- [ ] Database backup taken: `npx supabase db dump --data-only --file backups/pre_ai_comments_$(date +%Y%m%d).sql`

### Step 0.1 – Create AI Processing Logs Table Migration (60 minutes)

**File**: `supabase/migrations/20251016000001_create_ai_processing_logs.sql` (NEW)

**Purpose**: General-purpose table for tracking all AI operations (not just notes check).

**Migration content**:
```sql
-- Create ai_processing_logs table
CREATE TABLE ai_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_log_id UUID REFERENCES ai_processing_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'partial_success')),

  model_used TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  error_details JSONB,
  processing_time_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_logs_user ON ai_processing_logs(user_id);
CREATE INDEX idx_ai_logs_resource ON ai_processing_logs(resource_id);
CREATE INDEX idx_ai_logs_parent ON ai_processing_logs(parent_log_id);
CREATE INDEX idx_ai_logs_action_type ON ai_processing_logs(action_type);
CREATE INDEX idx_ai_logs_status ON ai_processing_logs(status, created_at);

-- Updated_at trigger
CREATE TRIGGER set_ai_logs_updated_at
  BEFORE UPDATE ON ai_processing_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE ai_processing_logs IS 'Tracks all AI processing operations (notes check, summarization, etc.)';
COMMENT ON COLUMN ai_processing_logs.action_type IS 'Type of AI operation: notes_check, summary_generation, etc.';
COMMENT ON COLUMN ai_processing_logs.parent_log_id IS 'Links retry attempts to original run';
COMMENT ON COLUMN ai_processing_logs.input_data IS 'Flexible JSONB for operation-specific input';
COMMENT ON COLUMN ai_processing_logs.output_data IS 'Flexible JSONB for operation-specific output';
```

**Validation query**:
```sql
-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_processing_logs'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ai_processing_logs';
```

**Expected results**:
- 12 columns (id, parent_log_id, user_id, resource_id, action_type, attempt_number, status, model_used, 4 data fields, 2 timestamps)
- 5 indexes (user, resource, parent, action_type, status)
- 1 trigger (updated_at)

### Step 0.2 – Add AI Fields to Comments Table Migration (45 minutes)

**File**: `supabase/migrations/20251016000002_add_ai_fields_to_comments.sql` (NEW)

**Purpose**: Extend existing `comments` table with AI-specific tracking fields.

**Migration content**:
```sql
-- Add AI-specific columns to comments table
ALTER TABLE comments
  ADD COLUMN created_by_ai BOOLEAN DEFAULT false,
  ADD COLUMN ai_comment_category TEXT CHECK (
    ai_comment_category IS NULL OR
    ai_comment_category IN ('general', 'selected_text')
  ),
  ADD COLUMN ai_suggestion_type TEXT CHECK (
    ai_suggestion_type IS NULL OR
    ai_suggestion_type IN ('missing_concept', 'rewording', 'factual_correction', 'structural_suggestion')
  ),
  ADD COLUMN ai_processing_log_id UUID REFERENCES ai_processing_logs(id) ON DELETE SET NULL,
  ADD COLUMN retry_count INTEGER DEFAULT 0;

-- Constraint: AI comments must have category and suggestion type
ALTER TABLE comments
  ADD CONSTRAINT ai_comment_fields_required CHECK (
    (created_by_ai = false) OR
    (created_by_ai = true AND
     ai_comment_category IS NOT NULL AND
     ai_suggestion_type IS NOT NULL)
  );

-- Index for filtering AI comments
CREATE INDEX idx_comments_created_by_ai ON comments(created_by_ai, resource_id);

-- Comments for documentation
COMMENT ON COLUMN comments.created_by_ai IS 'True if comment was generated by AI';
COMMENT ON COLUMN comments.ai_comment_category IS 'Category: general or selected_text (AI comments only)';
COMMENT ON COLUMN comments.ai_suggestion_type IS 'Type of suggestion: missing_concept, rewording, etc.';
COMMENT ON COLUMN comments.ai_processing_log_id IS 'Links to detailed AI processing log';
COMMENT ON COLUMN comments.retry_count IS 'Number of retry attempts needed to create this comment';
```

**Validation query**:
```sql
-- Verify new columns added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'comments'
  AND column_name LIKE 'ai_%' OR column_name = 'created_by_ai' OR column_name = 'retry_count'
ORDER BY ordinal_position;

-- Verify constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'comments'::regclass
  AND conname = 'ai_comment_fields_required';
```

**Expected results**:
- 5 new columns (created_by_ai, ai_comment_category, ai_suggestion_type, ai_processing_log_id, retry_count)
- 1 CHECK constraint (ai_comment_fields_required)
- 1 new index (idx_comments_created_by_ai)

### Step 0.3 – Create RLS Policies for AI Processing Logs (30 minutes)

**File**: `supabase/migrations/20251016000003_add_ai_logs_rls_policies.sql` (NEW)

**Migration content**:
```sql
-- Enable RLS on ai_processing_logs
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own logs
CREATE POLICY "users_view_own_ai_logs"
  ON ai_processing_logs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Service role can create logs (Edge Functions use service role)
CREATE POLICY "service_role_insert_ai_logs"
  ON ai_processing_logs FOR INSERT
  WITH CHECK (true);

-- UPDATE: Service role can update logs
CREATE POLICY "service_role_update_ai_logs"
  ON ai_processing_logs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: No one can delete logs (audit trail preservation)
-- (No DELETE policy = no one can delete)
```

**Validation query**:
```sql
-- Count policies created
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'ai_processing_logs';

-- Verify policy operations
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'ai_processing_logs'
ORDER BY policyname;
```

**Expected results**:
- 3 policies (SELECT for users, INSERT/UPDATE for service role)
- No DELETE policy (intentional - logs are permanent)

### Step 0.4 – Apply Migrations (15 minutes)

**Commands**:
```bash
# Apply all migrations
npx supabase db push

# Verify migrations applied
npx supabase migration list

# Regenerate TypeScript types
npx supabase gen types typescript --linked > src/types/supabase-generated.ts
```

**Success checks**:
- [ ] All 3 migrations applied without errors
- [ ] `supabase-generated.ts` updated with new types
- [ ] No errors in Supabase dashboard logs
- [ ] Tables visible in Supabase Table Editor

**Validation** (run in Supabase SQL Editor):
```sql
-- Comprehensive check
SELECT
  'ai_processing_logs' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'ai_processing_logs') as column_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'ai_processing_logs') as index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'ai_processing_logs') as policy_count
UNION ALL
SELECT
  'comments (AI fields)' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'comments' AND (column_name LIKE 'ai_%' OR column_name = 'created_by_ai' OR column_name = 'retry_count')) as column_count,
  NULL as index_count,
  NULL as policy_count;
```

**Expected output**:
```
table_name              | column_count | index_count | policy_count
------------------------|--------------|-------------|-------------
ai_processing_logs      | 12           | 5           | 3
comments (AI fields)    | 5            | NULL        | NULL
```

### Rollback Strategy for Phase 0

**If migrations fail**:

**Option 1 – Supabase Migration Repair**:
```bash
# Mark migrations as unapplied
npx supabase migration repair 20251016000003 --status reverted
npx supabase migration repair 20251016000002 --status reverted
npx supabase migration repair 20251016000001 --status reverted
```

**Option 2 – Manual Cleanup**:
```sql
-- Drop AI fields from comments
ALTER TABLE comments
  DROP COLUMN IF EXISTS created_by_ai,
  DROP COLUMN IF EXISTS ai_comment_category,
  DROP COLUMN IF EXISTS ai_suggestion_type,
  DROP COLUMN IF EXISTS ai_processing_log_id,
  DROP COLUMN IF EXISTS retry_count;

-- Drop ai_processing_logs table
DROP TABLE IF EXISTS ai_processing_logs CASCADE;
```

**Option 3 – Restore from Backup**:
```bash
psql $DATABASE_URL < backups/pre_ai_comments_YYYYMMDD.sql
```

---

## Phase 1 – Configuration System (1-2 hours) ❌ CRITICAL

### Objective
Create centralized configuration files for AI settings, prompts, and metadata inclusion rules.

### Step 1.1 – Create AI Configuration File (45 minutes)

**File**: `src/config/aiConfig.ts` (NEW)

**Create directory**:
```bash
mkdir -p src/config
```

**Implementation**:
```typescript
/**
 * AI Configuration
 * Centralized settings for AI Notes Check feature
 */

export const AI_CONFIG = {
  // Model settings
  MODEL: 'anthropic/claude-3-5-haiku-20241022' as const,

  // Comment constraints
  MAX_COMMENT_LENGTH: 200,
  MIN_SELECTED_TEXT_LENGTH: 5,
  MAX_RETRY_ATTEMPTS: 3,

  // Processing limits
  MAX_COMMENTS_PER_RUN: 20,

  // Prompts (see full prompts in feature doc)
  SYSTEM_PROMPT: `You are an AI assistant helping users improve their notes...`,

  JSON_SCHEMA_INSTRUCTIONS: `Return a JSON object with this exact structure...`,
} as const;

// Types for AI responses
export interface AICommentSuggestion {
  category: 'general' | 'selected_text';
  suggestionType: 'missing_concept' | 'rewording' | 'factual_correction' | 'structural_suggestion';
  body: string;
  selectedText: string | null;
}

export interface AICommentsResponse {
  comments: AICommentSuggestion[];
}
```

**Success check**: File compiles without errors, constants exportable.

### Step 1.2 – Create Metadata Configuration File (30 minutes)

**File**: `src/config/aiMetadataConfig.ts` (NEW)

**Implementation**:
```typescript
/**
 * AI Metadata Configuration
 * Defines which metadata fields to include per resource type
 */

export const AI_METADATA_CONFIG = {
  'short-video': ['author', 'description', 'transcript'],
  'video': ['title', 'description', 'transcript', 'author'],
  'book': ['title', 'description', 'author'],
  'article': ['title', 'url'],
} as const;

/**
 * Get metadata for AI processing
 */
export function getAIMetadataForResource(resource: any): Record<string, any> {
  const type = resource.type;
  const fields = AI_METADATA_CONFIG[type] || [];

  const metadata: Record<string, any> = {};
  fields.forEach(field => {
    if (resource[field] !== undefined && resource[field] !== null) {
      metadata[field] = resource[field];
    }
  });

  return metadata;
}
```

**Success checks**:
- [ ] TypeScript compiles without errors
- [ ] Helper function returns correct metadata
- [ ] Easy to add new resource types (one-line addition)

### Rollback Strategy for Phase 1

**If configuration has issues**:
```bash
# Revert files
rm src/config/aiConfig.ts
rm src/config/aiMetadataConfig.ts
rmdir src/config # if empty
```

**Impact**: No database or component changes, safe to revert.

---

## Phase 2 – Edge Function Implementation (4-6 hours) ❌ CRITICAL

### Objective
Implement `ai-notes-check` Edge Function with OpenRouter integration, retry logic, and comprehensive logging.

### Prerequisites
- [ ] OpenRouter account created with API key
- [ ] OpenRouter API key ready for configuration

### Step 2.1 – Configure OpenRouter API Key (10 minutes)

**Commands**:
```bash
# Set API key in Supabase secrets
npx supabase secrets set OPENROUTER_API_KEY=<your-key>

# Verify secret set
npx supabase secrets list
```

**Success check**: Secret appears in list (digest only, not plaintext).

### Step 2.2 – Create Edge Function Scaffold (30 minutes)

**Directory structure**:
```bash
mkdir -p supabase/functions/ai-notes-check
```

**File**: `supabase/functions/ai-notes-check/index.ts` (NEW)

**Basic structure**:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // 1. CORS handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    // 3. Parse request
    const { resourceId } = await req.json();

    // 4. Initialize Supabase client
    const supabase = createClient(/* ... */);

    // 5. Process (implement in steps below)
    const result = await processNotesCheck(/* ... */);

    // 6. Return response
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ai-notes-check] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Success check**: Function compiles with Deno (test locally if possible).

### Step 2.3 – Implement Processing Logic (120 minutes)

**Location**: Same file (`index.ts`)

**Key functions to implement**:

1. **Fetch resource and notes**:
```typescript
async function fetchResourceData(supabase, resourceId, userId) {
  // Query resource with RLS
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resourceId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}
```

2. **Build AI prompt** (use config from Phase 1):
```typescript
function buildPrompt(notes: string, metadata: Record<string, any>, existingComments: any[]) {
  return `
Notes:
${notes}

Metadata:
${JSON.stringify(metadata, null, 2)}

Existing AI Comments:
${existingComments.map(c => c.body).join('\n')}

Analyze and provide suggestions.
  `;
}
```

3. **Call OpenRouter API**:
```typescript
async function callOpenRouter(prompt: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://personal-knowledge-vault.vercel.app',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-5-haiku-20241022',
      messages: [
        { role: 'system', content: AI_CONFIG.SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

4. **Text matching with retry**:
```typescript
function findExactTextMatch(notes: string, selectedText: string) {
  const index = notes.indexOf(selectedText);
  if (index === -1) return null;

  // Check for multiple matches
  const secondOccurrence = notes.indexOf(selectedText, index + 1);
  if (secondOccurrence !== -1) return null; // Ambiguous

  return { start: index, end: index + selectedText.length };
}

async function processCommentWithRetry(
  suggestion: AICommentSuggestion,
  context: any,
  attemptNumber: number
): Promise<{ success: boolean; error?: string }> {
  if (suggestion.category === 'selected_text') {
    const match = findExactTextMatch(context.notes, suggestion.selectedText);

    if (!match) {
      if (attemptNumber < 3) {
        console.warn(`[Retry ${attemptNumber}] Text not found: "${suggestion.selectedText}"`);
        // Ask AI to fix (implementation detail)
        return processCommentWithRetry(/* revised suggestion */, context, attemptNumber + 1);
      }
      return { success: false, error: 'Text match failed after max retries' };
    }
  }

  // Create comment in database
  // ...

  return { success: true };
}
```

**Success checks**:
- [ ] All helper functions compile
- [ ] Error handling in place for API calls
- [ ] Logging statements added for debugging

### Step 2.4 – Implement Logging (45 minutes)

**Add comprehensive logging**:

```typescript
// Start processing log
const logId = await createProcessingLog(supabase, {
  userId,
  resourceId,
  actionType: 'notes_check',
  attemptNumber: 1,
  status: 'processing',
  modelUsed: AI_CONFIG.MODEL,
  inputData: { notes, metadata },
});

// Log to function logs (verbose)
console.log('[ai-notes-check] Starting for resource_id:', resourceId);
console.log('[ai-notes-check] Notes length:', notes.length);
console.log('[ai-notes-check] Metadata fields:', Object.keys(metadata));

// ... processing ...

// Update log on completion
await updateProcessingLog(supabase, logId, {
  status: 'completed',
  outputData: { commentsCreated: successCount, commentsFailed: failureCount },
  processingTimeMs: Date.now() - startTime,
});

console.log('[ai-notes-check] Summary:', successCount, 'created,', failureCount, 'failed');
```

**Success check**: Logs visible in Supabase Functions dashboard.

### Step 2.5 – Deploy Edge Function (15 minutes)

**Commands**:
```bash
# Deploy function
npx supabase functions deploy ai-notes-check

# Verify deployment
npx supabase functions list
```

**Success checks**:
- [ ] Function appears in list
- [ ] No deployment errors
- [ ] Function URL returned

### Step 2.6 – Test Edge Function (30 minutes)

**Manual test** (use curl or Postman):
```bash
curl -X POST https://<project-ref>.supabase.co/functions/v1/ai-notes-check \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"resourceId": "<test-resource-id>"}'
```

**Expected response**:
```json
{
  "success": true,
  "commentsCreated": 5,
  "processingLogId": "..."
}
```

**Success checks**:
- [ ] Function returns 200 status
- [ ] Comments created in database
- [ ] Processing log recorded
- [ ] Function logs visible in dashboard

### Rollback Strategy for Phase 2

**If Edge Function fails**:

**Option 1 – Disable function** (fastest):
```bash
# Function remains deployed but not called
# Frontend feature flag disables UI
```

**Option 2 – Delete function**:
```bash
npx supabase functions delete ai-notes-check
```

**Impact**: AI feature unavailable, but existing comments unaffected.

---

## Phase 3 – Storage Adapter Methods (2-3 hours) ❌ HIGH

### Objective
Add storage adapter methods for AI operations (fetch AI comments, create AI processing logs, create AI comments).

### Step 3.1 – Extend Storage Adapter Interface (30 minutes)

**File**: `src/data/storageAdapter.ts`

**Location**: Add after existing `CommentAdapter` interface

**Interface definition**:
```typescript
export interface AIAdapter {
  // Processing logs
  createAIProcessingLog(log: Partial<AIProcessingLog>): Promise<string>;
  updateAIProcessingLog(logId: string, updates: Partial<AIProcessingLog>): Promise<void>;
  getAIProcessingLogs(resourceId: string): Promise<AIProcessingLog[]>;

  // AI comments
  getActiveAIComments(resourceId: string, userId: string): Promise<Comment[]>;
  createAIComment(comment: CreateAICommentInput): Promise<Comment>;
}

export interface StorageAdapter extends ResourceAdapter, CommentAdapter, AIAdapter {
  // Combined interface
}
```

**Success check**: Interface compiles, no errors from existing code.

### Step 3.2 – Implement Supabase AI Adapter Methods (90 minutes)

**File**: `src/data/supabaseStorage.ts`

**Location**: Add methods to `SupabaseStorage` class

**Implementation**:
```typescript
/**
 * Create AI processing log entry
 */
async createAIProcessingLog(log: Partial<AIProcessingLog>): Promise<string> {
  const user = await this.getCurrentUser();

  const { data, error } = await this.supabase
    .from('ai_processing_logs')
    .insert({
      user_id: user.id,
      ...log,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Update AI processing log
 */
async updateAIProcessingLog(
  logId: string,
  updates: Partial<AIProcessingLog>
): Promise<void> {
  const { error } = await this.supabase
    .from('ai_processing_logs')
    .update(updates)
    .eq('id', logId);

  if (error) throw error;
}

/**
 * Get active AI comments (for context to avoid duplicates)
 */
async getActiveAIComments(resourceId: string, userId: string): Promise<Comment[]> {
  const { data, error } = await this.supabase
    .from('comments')
    .select('*')
    .eq('resource_id', resourceId)
    .eq('user_id', userId)
    .eq('created_by_ai', true)
    .eq('resolved', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create AI-generated comment
 */
async createAIComment(input: CreateAICommentInput): Promise<Comment> {
  const user = await this.getCurrentUser();

  const { data, error } = await this.supabase
    .from('comments')
    .insert({
      resource_id: input.resourceId,
      user_id: user.id,
      body: input.body,
      created_by_ai: true,
      ai_comment_category: input.category,
      ai_suggestion_type: input.suggestionType,
      ai_processing_log_id: input.processingLogId,
      retry_count: input.retryCount || 0,
      start_offset: input.startOffset,
      end_offset: input.endOffset,
      quoted_text: input.quotedText,
      resolved: false,
    })
    .select()
    .single();

  if (error) throw error;
  return this.mapToComment(data);
}
```

**Success checks**:
- [ ] All methods compile without errors
- [ ] Error handling in place
- [ ] User ID filtering applied (security)

### Step 3.3 – Update Storage Adapter Hook (15 minutes)

**File**: `src/data/storageAdapter.ts`

**Update `useStorageAdapter()` return type**:
```typescript
export function useStorageAdapter(): StorageAdapter {
  // Existing logic...
  return storage; // Now includes AIAdapter methods
}
```

**Success check**: Hook shows new methods in autocomplete.

### Rollback Strategy for Phase 3

**If storage adapter has issues**:
```bash
# Revert storage adapter file
git checkout HEAD -- src/data/supabaseStorage.ts
git checkout HEAD -- src/data/storageAdapter.ts
```

**Impact**: AI feature unavailable, but app still runs.

---

## Phase 4 – AI Tools Overlay UI (3-4 hours) ❌ HIGH

### Objective
Build AI Tools overlay with progress stages and tool cards (extensible for future AI features).

### Step 4.1 – Create AIToolsOverlay Component (90 minutes)

**File**: `src/components/AIToolsOverlay.tsx` (NEW)

**Implementation**:
```typescript
/**
 * AIToolsOverlay Component
 * Fixed-position overlay for AI tools
 */

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AIToolsOverlayProps {
  resourceId: string;
  currentNotes: string;
  onCommentsCreated: () => void;
}

export function AIToolsOverlay({
  resourceId,
  currentNotes,
  onCommentsCreated,
}: AIToolsOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="AI Tools"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      {/* Overlay */}
      {isOpen && (
        <Card className="fixed bottom-20 right-6 w-[320px] max-h-[400px] overflow-y-auto shadow-xl">
          <div className="p-4 space-y-3">
            <h3 className="font-semibold">AI Tools</h3>

            {/* Tool: AI Notes Check */}
            <AINotesCheckTool
              resourceId={resourceId}
              currentNotes={currentNotes}
              onComplete={onCommentsCreated}
            />
          </div>
        </Card>
      )}
    </>
  );
}
```

**Success checks**:
- [ ] Button renders in bottom-right
- [ ] Overlay toggles on button click
- [ ] Overlay positioned correctly

### Step 4.2 – Create AINotesCheckTool Component (120 minutes)

**File**: `src/components/AINotesCheckTool.tsx` (NEW)

**Implementation**:
```typescript
/**
 * AINotesCheckTool Component
 * Handles AI notes check processing with progress stages
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type ProcessingStage = 'idle' | 'analyzing' | 'generating' | 'creating' | 'complete' | 'error';

const STAGE_MESSAGES = {
  analyzing: 'Analyzing your notes and metadata...',
  generating: 'Generating improvement suggestions...',
  creating: 'Creating comments in your sidebar...',
  complete: 'AI review complete!',
  error: 'Something went wrong. Please try again.',
};

export function AINotesCheckTool({
  resourceId,
  currentNotes,
  onComplete,
}: AINotesCheckToolProps) {
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [commentsCreated, setCommentsCreated] = useState(0);

  const runAICheck = useMutation({
    mutationFn: async () => {
      // Stage 1: Analyzing
      setStage('analyzing');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Call Edge Function
      const response = await fetch('/functions/v1/ai-notes-check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resourceId }),
      });

      if (!response.ok) throw new Error('Processing failed');
      const result = await response.json();

      // Stage 2: Generating (simulated for UX)
      setStage('generating');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Stage 3: Creating
      setStage('creating');
      await new Promise(resolve => setTimeout(resolve, 1000));

      return result;
    },
    onSuccess: (result) => {
      setStage('complete');
      setCommentsCreated(result.commentsCreated);
      setTimeout(() => {
        onComplete();
        setStage('idle');
      }, 2000);
    },
    onError: () => {
      setStage('error');
    },
  });

  return (
    <div className="space-y-3">
      <Button
        onClick={() => runAICheck.mutate()}
        disabled={stage !== 'idle'}
        className="w-full"
      >
        {stage === 'idle' ? 'AI Notes Check' : STAGE_MESSAGES[stage]}
      </Button>

      {stage !== 'idle' && stage !== 'complete' && (
        <Progress value={undefined} className="w-full" />
      )}

      {stage === 'complete' && (
        <p className="text-sm text-green-600">
          ✓ {commentsCreated} suggestions added
        </p>
      )}

      {stage === 'error' && (
        <p className="text-sm text-red-600">
          {STAGE_MESSAGES.error}
        </p>
      )}
    </div>
  );
}
```

**Success checks**:
- [ ] Button triggers processing
- [ ] Progress stages display correctly
- [ ] Success/error states show appropriately

### Rollback Strategy for Phase 4

**If UI components fail**:
```bash
# Remove components
rm src/components/AIToolsOverlay.tsx
rm src/components/AINotesCheckTool.tsx
```

**Impact**: No AI UI, but app still runs.

---

## Phase 5 – Comment Styling (Rainbow Borders) (1-2 hours) ❌ MEDIUM

### Objective
Add distinctive rainbow gradient borders to AI-generated comments for instant visual recognition.

### Step 5.1 – Update CommentCard Component (45 minutes)

**File**: `src/components/comments/CommentCard.tsx`

**Location**: Update card className logic (around line 30)

**Change**:
```typescript
// Detect AI comment
const isAIComment = comment.created_by_ai;

// Rainbow gradient border for AI comments
<Card
  className={cn(
    'transition-all cursor-pointer hover:shadow-md',
    isActive && 'ring-2 ring-primary shadow-lg',
    comment?.isStale && 'border-orange-400',
    isAIComment && 'ai-comment-rainbow-border', // NEW
    !isNew && 'hover:scale-[1.02]'
  )}
  onClick={onClick}
>
```

**Success check**: AI comments show rainbow border.

### Step 5.2 – Add Rainbow Border CSS (30 minutes)

**File**: `src/index.css`

**Location**: Add to `@layer components` section

**CSS**:
```css
.ai-comment-rainbow-border {
  border: 2px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg,
                #667eea 0%,
                #764ba2 25%,
                #f093fb 50%,
                #4facfe 75%,
                #00f2fe 100%) border-box;
}

@media (prefers-color-scheme: dark) {
  .ai-comment-rainbow-border {
    background: linear-gradient(hsl(var(--card)), hsl(var(--card))) padding-box,
                linear-gradient(135deg,
                  #667eea 0%,
                  #764ba2 25%,
                  #f093fb 50%,
                  #4facfe 75%,
                  #00f2fe 100%) border-box;
  }
}
```

**Success checks**:
- [ ] Rainbow border appears on AI comments
- [ ] Border works in light and dark modes
- [ ] High contrast maintained (accessibility)

### Rollback Strategy for Phase 5

**If styling has issues**:
```bash
# Revert CSS
git checkout HEAD -- src/index.css

# Revert component
git checkout HEAD -- src/components/comments/CommentCard.tsx
```

**Impact**: AI comments look like regular comments, but still functional.

---

## Phase 6 – NotesEditorDialog Integration (2-3 hours) ❌ HIGH

### Objective
Integrate AI Tools overlay into NotesEditorDialog and connect comment refresh logic.

### Step 6.1 – Add AI Tools Overlay to Dialog (60 minutes)

**File**: `src/components/NotesEditorDialog.tsx`

**Location**: Add to dialog content (around line 250)

**Add imports**:
```typescript
import { AIToolsOverlay } from '@/components/AIToolsOverlay';
```

**Add to JSX**:
```typescript
<DialogContent className="max-w-[1800px] max-h-[90vh] flex flex-col">
  {/* Existing toolbar, editor, sidebar... */}

  {/* NEW: AI Tools Overlay */}
  <AIToolsOverlay
    resourceId={resourceId}
    currentNotes={currentValue}
    onCommentsCreated={() => {
      // Refetch comments to show new AI suggestions
      loadComments();
    }}
  />
</DialogContent>
```

**Success checks**:
- [ ] AI Tools button appears in dialog
- [ ] Button positioned correctly (bottom-right)
- [ ] Overlay doesn't interfere with sidebar

### Step 6.2 – Test Integration (45 minutes)

**Manual test flow**:
1. Open NotesEditorDialog with notes
2. Click AI Tools button
3. Run "AI Notes Check"
4. Verify progress stages display
5. Wait for completion
6. Verify AI comments appear in sidebar with rainbow borders
7. Verify comment bodies ≤200 characters
8. Click AI comment → verify highlight works
9. Resolve AI comment → verify it moves to resolved

**Success checks**:
- [ ] End-to-end flow works without errors
- [ ] AI comments visually distinct (rainbow borders)
- [ ] Comment count updates in toolbar
- [ ] AI comments behave like user comments (resolve, delete)

### Rollback Strategy for Phase 6

**If integration breaks dialog**:
```typescript
// In NotesEditorDialog.tsx, comment out:
{/* <AIToolsOverlay ... /> */}
```

**Impact**: No AI feature, but dialog still functional for editing.

---

## Phase 7 – Testing & Validation (3-4 hours) ❌ CRITICAL

### Objective
Comprehensive testing of AI Notes Check feature end-to-end.

### Step 7.1 – Database Validation (30 minutes)

**After running AI check**:
```sql
-- Verify AI comments created
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

-- Verify processing log
SELECT
  id,
  status,
  model_used,
  attempt_number,
  output_data->>'commentsCreated' as comments_created,
  processing_time_ms
FROM ai_processing_logs
WHERE resource_id = '<test-resource-id>'
ORDER BY created_at DESC;

-- Verify retry chains
SELECT
  id,
  parent_log_id,
  attempt_number,
  status,
  error_details
FROM ai_processing_logs
WHERE parent_log_id IS NOT NULL;
```

**Expected results**:
- AI comments have correct fields populated
- Processing log records status and timing
- Retry chains linked via parent_log_id

### Step 7.2 – Manual Test Scenarios (90 minutes)

**Test checklist**:
- [ ] **Happy path**: Open dialog → run AI check → comments created
- [ ] **Empty notes**: Very short notes → AI creates general comment
- [ ] **Long notes**: 2000+ words → AI creates multiple suggestions
- [ ] **No duplicates**: Run twice without editing → no duplicate suggestions
- [ ] **Rainbow borders**: AI comments visually distinct
- [ ] **Text anchoring**: Selected-text comments highlight correctly
- [ ] **Resolution**: Resolve AI comment → moves to resolved modal
- [ ] **Deletion**: Delete AI comment → removed from database
- [ ] **Error handling**: Temporarily revoke API key → friendly error shown

### Step 7.3 – Performance Testing (30 minutes)

**Benchmarks**:
- [ ] Notes (500 words) + transcript (2000 words): <8 seconds
- [ ] Notes (2000 words) + transcript (5000 words): <12 seconds
- [ ] Empty notes: <5 seconds
- [ ] Text matching: <100ms per comment

**If performance degrades**:
1. Check OpenRouter API latency in logs
2. Check text matching performance
3. Check database query performance

### Step 7.4 – Build & Quality Checks (30 minutes)

**Commands**:
```bash
# TypeScript check
npm run build

# Lint check
npm run lint

# Type generation
npx supabase gen types typescript --linked
```

**Success checks**:
- [ ] Build passes without errors
- [ ] No linting errors
- [ ] Types generated correctly

### Rollback Strategy for Phase 7

**If critical issues found**:
- Document issues in GitHub issues
- Feature flag disable AI feature
- Rollback database migrations if necessary
- Address issues before re-enabling

---

## Phase 8 – Deployment & Monitoring (1-2 hours) ❌ MEDIUM

### Objective
Deploy AI Notes Check feature to production and establish monitoring.

### Step 8.1 – Pre-Deployment Checklist (30 minutes)

**Verify**:
- [ ] All migrations applied: `npx supabase db push`
- [ ] Types regenerated: `npx supabase gen types typescript --linked`
- [ ] Edge function deployed: `npx supabase functions deploy ai-notes-check`
- [ ] OpenRouter API key set: `npx supabase secrets set OPENROUTER_API_KEY=...`
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`

### Step 8.2 – Deploy to Production (30 minutes)

**Steps**:
1. Push to `main` branch (triggers Vercel auto-deploy)
2. Wait for Vercel deployment to complete
3. Verify production URL loads without errors
4. Run smoke test in production:
   - Open resource with notes
   - Run AI Notes Check
   - Verify comments created

**Success checks**:
- [ ] Production site loads
- [ ] AI feature works in production
- [ ] No console errors
- [ ] Supabase logs show successful calls

### Step 8.3 – Monitor Initial Usage (30 minutes)

**Check**:
1. Supabase Functions logs (dashboard)
2. Processing log table for errors
3. OpenRouter API usage/costs
4. User reports (if any)

**Metrics to track**:
- Number of AI check runs per day
- Success rate (completed vs. failed)
- Average processing time
- Average comments per run
- Cost per run (OpenRouter)

**If issues arise**:
- Check function logs for errors
- Check database for failed processing logs
- Roll back if critical issues found

### Rollback Strategy for Phase 8

**Emergency rollback**:

**Option 1 – Feature flag disable** (fastest):
```typescript
// In AIToolsOverlay.tsx
const ENABLE_AI_FEATURES = false; // Feature flag

if (!ENABLE_AI_FEATURES) {
  return null; // Hide AI Tools button
}
```

**Option 2 – Git revert** (clean):
```bash
git revert <commit-hash>
git push origin main
```

**Option 3 – Database rollback** (preserve data):
```sql
-- Soft disable: Mark all AI comments as system-generated for later review
UPDATE comments SET status = 'resolved' WHERE created_by_ai = true;
```

**Impact**: AI feature disabled, but existing comments preserved.

---

## Testing Checklist (Comprehensive)

### Database Testing
- [ ] AI processing logs table created with correct schema
- [ ] Comments table has AI fields
- [ ] RLS policies allow users to view own logs
- [ ] Service role can create/update logs
- [ ] Indexes created for performance

### Edge Function Testing
- [ ] Function deploys without errors
- [ ] OpenRouter API key configured correctly
- [ ] Function authenticates requests properly
- [ ] Function creates comments in database
- [ ] Function logs to processing logs table
- [ ] Retry logic works for text matching failures
- [ ] Error handling returns user-friendly messages

### Storage Adapter Testing
- [ ] getActiveAIComments returns correct data
- [ ] createAIProcessingLog creates log entry
- [ ] updateAIProcessingLog updates correctly
- [ ] createAIComment creates with all required fields

### UI Testing
- [ ] AI Tools button appears in dialog
- [ ] Overlay toggles on button click
- [ ] Progress stages display correctly
- [ ] Success/error states show appropriately
- [ ] Rainbow borders appear on AI comments
- [ ] AI comments behave like user comments

### Integration Testing
- [ ] End-to-end flow works (button → API → comments → UI)
- [ ] Comment count updates after AI run
- [ ] AI comments visible in sidebar
- [ ] Text highlighting works for selected-text comments
- [ ] Resolution workflow works for AI comments

### Performance Testing
- [ ] Processing completes in <10 seconds for typical notes
- [ ] No UI lag during processing
- [ ] Database queries fast (<200ms)
- [ ] Text matching fast (<100ms per comment)

### Security Testing
- [ ] API key not exposed to client
- [ ] RLS policies prevent unauthorized access
- [ ] User can only see own processing logs
- [ ] User can only see own AI comments

---

## Rollback Strategy (Overall)

### Emergency Rollback (All Phases)

**Option 1 – Feature Flag Disable** (Fastest):
```typescript
// In AIToolsOverlay.tsx
const ENABLE_AI_FEATURES = false;

if (!ENABLE_AI_FEATURES) {
  return null;
}
```

**Option 2 – Git Revert** (Clean):
```bash
# Find AI-related commits
git log --oneline --grep="AI Notes Check"

# Revert commits
git revert <commit-hash>
git push origin main
```

**Option 3 – Database Rollback** (Preserve Data):
```sql
-- Drop AI tables (preserves comments)
DROP TABLE IF EXISTS ai_processing_logs CASCADE;

-- Remove AI fields from comments (optional)
ALTER TABLE comments
  DROP COLUMN IF EXISTS created_by_ai,
  DROP COLUMN IF EXISTS ai_comment_category,
  DROP COLUMN IF EXISTS ai_suggestion_type,
  DROP COLUMN IF EXISTS ai_processing_log_id,
  DROP COLUMN IF EXISTS retry_count;
```

**Impact**: AI feature disabled, notes editing unaffected.

---

## Deliverables Checklist

### Database
- [ ] `ai_processing_logs` table migration created
- [ ] `comments` table AI fields migration created
- [ ] RLS policies migration created
- [ ] Migrations applied to production
- [ ] Types regenerated

### Configuration
- [ ] `src/config/aiConfig.ts` created
- [ ] `src/config/aiMetadataConfig.ts` created
- [ ] All constants centralized (no magic numbers)

### Edge Function
- [ ] `supabase/functions/ai-notes-check/index.ts` implemented
- [ ] OpenRouter API integration complete
- [ ] Retry logic with AI feedback implemented
- [ ] Text matching algorithm implemented
- [ ] Detailed logging added
- [ ] Error handling for all edge cases
- [ ] Function deployed and tested

### Storage Adapter
- [ ] `getActiveAIComments` method added
- [ ] `createAIProcessingLog` method added
- [ ] `updateAIProcessingLog` method added
- [ ] `createAIComment` method added
- [ ] All methods tested

### Components
- [ ] `AIToolsOverlay.tsx` created
- [ ] `AINotesCheckTool.tsx` created
- [ ] `CommentCard.tsx` enhanced with rainbow borders
- [ ] `NotesEditorDialog.tsx` integrated AI Tools overlay
- [ ] Progress stages implemented
- [ ] Error states implemented

### Styling
- [ ] Rainbow gradient border CSS added
- [ ] AI Tools overlay styling completed
- [ ] Responsive design tested
- [ ] Dark mode compatibility verified
- [ ] Accessibility verified (contrast, focus states)

### Testing
- [ ] Manual test scenarios completed
- [ ] Database validation queries run
- [ ] Performance benchmarks measured
- [ ] Build and lint checks passed
- [ ] Edge cases tested

### Documentation
- [ ] Feature specification completed
- [ ] Implementation plan completed (this document)
- [ ] CLAUDE.md updated with AI patterns
- [ ] Code comments added for complex logic

### Deployment
- [ ] Database migrations applied to production
- [ ] Edge function deployed to production
- [ ] OpenRouter API key configured in production
- [ ] Frontend deployed (Vercel auto-deploy)
- [ ] Smoke test passed in production
- [ ] Monitoring in place

---

## Summary

**Feature**: AI-powered note review system with Claude 3.5 Haiku via OpenRouter, creating improvement suggestions as comments with intelligent text anchoring and retry logic.

**Current State**: Ready for implementation. All decisions finalized, implementation path validated against existing codebase patterns.

**Approach**:
1. Backend-first: Database schema → Edge Function → Storage adapter
2. Frontend-second: UI components → Integration → Styling
3. Validation-last: Testing → Deployment → Monitoring

**Impact**:
- **User Experience**: Intelligent feedback loop for solitary note-taking; encourages active engagement
- **Technical Debt**: Minimal (reuses comment system, clean separation of concerns, future-proof logging)
- **Performance**: Fast (Claude 3.5 Haiku optimized for speed; <10s typical processing)
- **Reliability**: High (retry logic, detailed logging, graceful degradation)
- **Cost**: Low (Haiku cost-effective; ~$0.01-0.05 per check)

**User Value**: Very High (fills gap in learning workflow; provides feedback that wouldn't happen otherwise)

**Risk Level**: Medium (new AI integration, prompt engineering, text matching complexity, API dependency)

**Dependencies**:
- OpenRouter API account with Claude 3.5 Haiku access
- Supabase Edge Functions operational
- Existing comment system functional (verified)
- NotesEditorDialog with markdown editing (verified)

**Estimated Effort**: 20-30 hours across 8 focused implementation phases (~3-4 days)

**Next Steps**:
1. START: Phase 0 (Database Schema) - CRITICAL
2. THEN: Phase 1 (Configuration) - CRITICAL
3. THEN: Phase 2 (Edge Function) - CRITICAL
4. CONTINUE: Phases 3-8 in sequence

---

*Document Version: 1.0*
*Created: 2025-10-16*
*Status: Ready for Implementation*
