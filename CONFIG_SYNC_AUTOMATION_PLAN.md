# Config Sync Automation System – Implementation Plan

## Overview & Strategy

- **Goal**: Implement automated validation and deployment workflows to prevent configuration drift between frontend and Edge Functions, eliminating manual sync errors and blocking deployments when configs are out of sync.
- **Approach**: Create granular sync check scripts per Edge Function using separate scripts + composition pattern; add inline warnings to duplicated files; document sync requirements in CLAUDE.md; use npm scripts to enforce checks before deployment.
- **Guiding principles**: Fail-fast deployment blocking (not silent warnings), single responsibility per script (fast iteration), composition over monoliths (flexible workflows), human + AI + automated reminders (defense in depth), future-ready for database-backed config migration.

> Update (2025-10-18): Per-config scripts were replaced by a single unified checker (`scripts/check-config-sync.js`) exposed as `npm run check-sync:all`. References to legacy command names below are kept for historical context only.

## Current Status (2025-10-17, refreshed 2025-11-06)

**IN PROGRESS**: Phase 0 (warnings/docs) and Phase 2 (short-form sync automation) are complete. Phase 1 was de-scoped after consolidating AI configs into the Edge Function source of truth. Remaining batches cover composite workflows, CI wiring, and validation layers.

### Project Context
- **Edge Functions**: Two active functions (`ai-notes-check`, `short-form`)
- **Duplication Problem**: Edge Functions run in Deno and cannot import from `src/` directory, forcing config/utility duplication
- **Current Pain Point**: Manual sync required between frontend source files and Edge Function copies; easy to forget during rapid iteration
- **Deployment Tools**: Supabase CLI for Edge Functions; Vercel for frontend; npm scripts for orchestration

### Identified Duplications

| Config/Utility | Frontend Source of Truth | Edge Function Copy | Used By |
|----------------|--------------------------|-------------------|---------|
| `AI_CONFIG` | `src/config/aiConfig.ts` | `supabase/functions/ai-notes-check/config.ts` | ai-notes-check |
| `AI_METADATA_CONFIG` | `src/config/aiMetadataConfig.ts` | `supabase/functions/ai-notes-check/config.ts` | ai-notes-check |
| `PLATFORM_CONFIGS` | `src/types/shortFormApi.ts` | `supabase/functions/short-form/types.ts` | short-form |
| `POLLING_CONFIG` | `src/types/shortFormApi.ts` | `supabase/functions/short-form/types.ts` | short-form |
| `normalizeUrl` | `src/utils/urlDetection.ts` | `supabase/functions/short-form/utils/urlUtils.ts` | short-form |

### Prerequisites Verified
- [x] Two Edge Functions deployed and operational
- [x] Supabase CLI working (`npx supabase functions deploy` tested)
- [x] Node.js ES module support (type: "module" in package.json)
- [x] CLAUDE.md exists for AI assistant guidelines
- [x] Batch 1 resolved: AI notes check config now lives solely in Edge Function (no duplication to validate)
- [x] Batch 2 complete: Short-form sync validation (Phase 2)
- [ ] Batch 3 complete: Composite workflows (Phase 3)

## Phases & Timeline

| Phase | Focus | Duration | Status | Priority |
|-------|-------|----------|--------|----------|
| 0 | Warning comments & CLAUDE.md documentation | 1-2 hours | COMPLETE | CRITICAL |
| 1 | AI notes check sync automation (Batch 1) | 2-3 hours | DE-SCOPED (Edge Function single source) | CRITICAL |
| 2 | Short-form sync automation (Batch 2) | 3-4 hours | COMPLETE | HIGH |
| 3 | Composite workflows & CI/CD (Batch 3) | 1-2 hours | PENDING | MEDIUM |
| 4 | Edge Function secrets validation (bonus) | 2-3 hours | PENDING | LOW |
| 5 | Testing & validation | 1-2 hours | PENDING | HIGH |
| **TOTAL** | **Full implementation** | **~10-16 hours** | | **~2-3 days** |

---

## Phase 0 – Warning Comments & Documentation (1-2 hours) ✅ CRITICAL

### Objective
Add inline warnings to all duplicated config/utility files and document sync requirements in CLAUDE.md so both humans and AI assistants are aware of sync obligations.

### Prerequisites
- [x] CLAUDE.md file exists
- [x] Identified all duplicated files

### Step 0.1 – Add Warning Comments to AI Notes Check Files (20 minutes) ✅

**Files modified**:
- `src/config/aiConfig.ts`
- `supabase/functions/ai-notes-check/config.ts`

**Warning format** (applied):
```typescript
/**
 * ⚠️ SYNC WARNING ⚠️
 * ==================
 * This file is DUPLICATED and must be manually synced.
 *
 * SOURCE OF TRUTH: src/config/aiConfig.ts (edit this one)
 * MUST SYNC TO:    supabase/functions/ai-notes-check/config.ts
 *
 * WHY: Edge Functions cannot import from src/ directory (Deno runtime limitation)
 *
 * AFTER EDITING: Run npm run deploy:edge:ai-notes-check
 */
```

**Validation**:
- [x] Warning appears at top of both files
- [x] Clearly identifies source of truth vs. copy
- [x] Provides deployment command

### Step 0.2 – Add Warning Comments to Remaining Duplicated Files (30 minutes) ❌

**Files to modify**:
1. `src/config/aiMetadataConfig.ts` (source)
2. `src/types/shortFormApi.ts` (source for PLATFORM_CONFIGS, POLLING_CONFIG)
3. `supabase/functions/short-form/types.ts` (copy)
4. `src/utils/urlDetection.ts` (source for normalizeUrl function)
5. `supabase/functions/short-form/utils/urlUtils.ts` (copy)

**Warning pattern**:
- Source files: "SOURCE OF TRUTH - edit this, sync to Edge Function"
- Copy files: "DO NOT EDIT DIRECTLY - synced from frontend"
- Both: Include deployment command

### Step 0.3 – Update CLAUDE.md with Sync Requirements (30 minutes) ✅

**File**: `CLAUDE.md`

**Sections added**:

1. **Configuration File Synchronization (MANDATORY)** section in "Critical Code Patterns"
   - Table mapping source → copy → deployment command
   - Workflow steps (edit → sync → deploy)
   - Automated protection explanation

2. **Common Issues table entry**:
   - Issue: "Config out of sync / Edge Function outdated"
   - Solution: Copy changes, run deployment script

**Validation**:
- [x] Section added before "React Hooks Order & Dependencies"
- [x] Table includes all 5 duplications
- [x] Mentions future improvements (database-backed config)

**Success Criteria**:
- ✅ All 7 files have clear sync warnings
- ✅ CLAUDE.md documents sync workflow
- ✅ AI assistant will see warnings when reading files
- ✅ Human developers warned when opening files

---

## Phase 1 - AI Notes Check Sync Automation (Batch 1) (2-3 hours) - CRITICAL

> NOTE (2025-11-06): This phase was de-scoped after consolidating AI configs into supabase/functions/ai-notes-check/config.ts. The historical steps remain below for reference only.

### Objective
Create automated sync validation for AI notes check Edge Function, covering both `AI_CONFIG` and `AI_METADATA_CONFIG`, with deployment script that blocks on mismatch.

### Prerequisites
- [x] Phase 0 complete (warnings in place)
- [x] Node.js installed (ES modules supported)

### Step 1.1 – Create AI Config Sync Check Script (30 minutes) ✅

**File**: `scripts/check-ai-model-settings.js` (CREATED)

**Purpose**: Compare `AI_CONFIG` constant between frontend and Edge Function.

This script is now: **`scripts/check-ai-model-settings.js`**

**Implementation approach**:
- Extract `AI_CONFIG` using regex: `/export const AI_CONFIG = \{[\s\S]*?\} as const;/`
- Normalize whitespace and inline comments for comparison
- Exit code 0 if synced, 1 if mismatched
- Clear error message showing which files are out of sync

**Validation**:
```bash
# Test when synced
npm run check-sync  # Should exit 0 with success message

# Test when out of sync (modify one file)
# Should exit 1 with clear error and action steps
```

**Success criteria**:
- ✅ Script compares exact config constants
- ✅ Ignores formatting differences (whitespace, inline comments)
- ✅ Blocks with exit code 1 on mismatch
- ✅ Shows actionable error message

### Step 1.2 – Create AI Metadata Sync Check Script (45 minutes) ❌

**File**: `scripts/check-ai-metadata-fields.js` (NEW)

**Purpose**: Compare `AI_METADATA_CONFIG` between `src/config/aiMetadataConfig.ts` and Edge Function config.

This script is now: **`scripts/check-ai-metadata-fields.js`**

**Implementation approach**:
- Similar to `check-config-sync.js` but for different constant name
- Handle different file paths (separate frontend file vs. combined Edge config)
- Extract from `aiMetadataConfig.ts` vs. `ai-notes-check/config.ts`

**Key differences from AI_CONFIG check**:
- Frontend source: separate file (`src/config/aiMetadataConfig.ts`)
- Edge Function: same file as AI_CONFIG (`supabase/functions/ai-notes-check/config.ts`)
- Extract: `/export const AI_METADATA_CONFIG.*?\} as const;/`

**Validation**:
```bash
npm run check-sync:ai-metadata  # Should validate metadata config
```

**Success criteria**:
- [ ] Correctly extracts from separate frontend file
- [ ] Compares against combined Edge Function config
- [ ] Clear error messages specific to metadata config

### Step 1.3 – Create Composite AI Notes Check Script (15 minutes) ❌

**Purpose**: Run both AI config checks before deploying AI notes check function.

**Package.json updates**:
```json
{
  "scripts": {
    "check-sync:ai-model-settings": "node scripts/check-ai-model-settings.js",
    "check-sync:ai-metadata-fields": "node scripts/check-ai-metadata-fields.js",
    "check-sync:ai-analysis": "npm run check-sync:ai-model-settings && npm run check-sync:ai-metadata-fields",
    "deploy:edge:ai-notes-check": "npm run check-sync:ai-analysis && npx supabase functions deploy ai-notes-check"
  }
}
```

**Behavior**:
- Runs both checks sequentially (stops on first failure)
- Only proceeds to deployment if both pass
- Clear output showing which check succeeded/failed

**Validation**:
```bash
npm run deploy:edge:ai-notes-check  # Should check both configs before deploying
```

**Success criteria**:
- [ ] Both checks run before deployment
- [ ] Deployment blocked if either check fails
- [ ] Clear output showing progress

### Step 1.4 – Sync Current Configs (30 minutes) ✅

**Purpose**: Ensure all AI notes check configs are currently in sync before automation goes live.

**Actions taken**:
- [x] Copied missing inline comments from frontend to Edge config
- [x] Synced SYSTEM_PROMPT improvements (added examples to "general" category)
- [x] Verified exact match with `npm run check-sync`

**Files synchronized**:
- [x] `AI_CONFIG`: All inline comments, JSDoc descriptions match
- [ ] `AI_METADATA_CONFIG`: Need to verify sync status

**Validation**:
```bash
npm run check-sync:ai-notes-check  # Should pass with no errors
```

**Success Criteria**:
- ✅ `AI_CONFIG` synced between frontend and Edge Function
- [ ] `AI_METADATA_CONFIG` synced
- [ ] Deployment script successfully deploys when synced
- [ ] Deployment script blocks when manually desynced (negative test)

---

## Phase 2 – Short-Form Sync Automation (Batch 2) (3-4 hours) ❌ HIGH

### Objective
Create automated sync validation for short-form Edge Function, covering `PLATFORM_CONFIGS`, `POLLING_CONFIG`, and `normalizeUrl` utility function.

### Prerequisites
- [x] Phase 1 de-scoped (AI notes check config consolidated in Edge Function)
- [ ] Understanding of short-form Edge Function architecture

### Step 2.1 – Create Short-Form Config Sync Check Script (60 minutes) ❌

**File**: `scripts/check-video-platform-extraction.js` (NEW)

Now: **`scripts/check-video-platform-extraction.js`**

**Purpose**: Validate both `PLATFORM_CONFIGS` and `POLLING_CONFIG` between frontend and Edge Function.

**Implementation approach**:
- Extract both constants from same frontend file: `src/types/shortFormApi.ts`
- Extract both from same Edge file: `supabase/functions/short-form/types.ts`
- Compare each constant separately, report which one(s) are out of sync
- Single script handles both configs (same file pair)

**Regex patterns**:
```javascript
// Extract PLATFORM_CONFIGS
/export const PLATFORM_CONFIGS.*?\} as const;/s

// Extract POLLING_CONFIG
/export const POLLING_CONFIG.*?\} as const;/s
```

**Error output format**:
```
❌ SYNC ERROR: Short-form configs are out of sync!

  Out of sync configs:
  - PLATFORM_CONFIGS ❌
  - POLLING_CONFIG ✅

  Source:  src/types/shortFormApi.ts
  Copy:    supabase/functions/short-form/types.ts

  ACTION: Sync PLATFORM_CONFIGS and re-run deployment
```

**Validation**:
```bash
npm run check-sync:short-form-config  # Should validate both configs
```

**Success criteria**:
- [ ] Extracts both configs from same file pair
- [ ] Reports which config(s) are out of sync
- [ ] Clear actionable error messages

### Step 2.2 – Create Short-Form Utils Sync Check Script (90 minutes) ❌

**File**: `scripts/check-url-normalization.js` (NEW)

Now: **`scripts/check-url-normalization.js`**

**Purpose**: Validate `normalizeUrl` function between frontend and Edge Function.

**Challenge**: Function sync validation is more complex than const validation:
- Function implementations can have formatting variations
- Comments/whitespace differences don't affect behavior
- Need to extract function declaration + body

**Implementation approach**:

**Option A (Recommended)**: Strict string comparison
```javascript
// Extract entire function
/export function normalizeUrl\([^)]*\)[^{]*\{[\s\S]*?^}/m

// Normalize: remove comments, collapse whitespace
// Compare normalized versions
```

**Option B (Alternative)**: AST-based comparison
- Use `@babel/parser` to parse both functions
- Compare AST nodes (ignores all formatting)
- More robust but adds dependency

**Recommendation**: Start with Option A (string comparison), upgrade to Option B if formatting causes false positives.

**Error output format**:
```
❌ SYNC ERROR: normalizeUrl function is out of sync!

  Source:  src/utils/urlDetection.ts
  Copy:    supabase/functions/short-form/utils/urlUtils.ts

  ACTION: Sync function implementation and re-run deployment
```

**Validation**:
```bash
npm run check-sync:short-form-utils  # Should validate normalizeUrl
```

**Success criteria**:
- [ ] Extracts function from both files
- [ ] Handles formatting variations gracefully
- [ ] Clear error when implementations differ
- [ ] No false positives from comment/whitespace differences

### Step 2.3 – Create Composite Short-Form Script (20 minutes) ❌

**Purpose**: Run all short-form checks before deploying short-form function.

**Package.json updates**:
```json
{
  "scripts": {
    "check-sync:video-platform-extraction": "node scripts/check-video-platform-extraction.js",
    "check-sync:video-polling-settings": "node scripts/check-video-polling-settings.js",
    "check-sync:url-normalization": "node scripts/check-url-normalization.js",
    "check-sync:short-form-processor": "npm run check-sync:video-platform-extraction && npm run check-sync:video-polling-settings && npm run check-sync:url-normalization",
    "deploy:edge:short-form": "npm run check-sync:short-form-processor && npx supabase functions deploy short-form"
  }
}
```

**Validation**:
```bash
npm run deploy:edge:short-form  # Should check all video configs + utils before deploying
```

**Success criteria**:
- [ ] Both checks run sequentially
- [ ] Deployment blocked if either fails
- [ ] Clear progress output

### Step 2.4 – Add Sync Warnings to Short-Form Files (30 minutes) ❌

**Files to modify**:
1. `src/types/shortFormApi.ts` - Add warnings for PLATFORM_CONFIGS + POLLING_CONFIG
2. `supabase/functions/short-form/types.ts` - Add "DO NOT EDIT" warning
3. `src/utils/urlDetection.ts` - Add warning for normalizeUrl function
4. `supabase/functions/short-form/utils/urlUtils.ts` - Add "DO NOT EDIT" warning

**Warning placement**:
- Above `PLATFORM_CONFIGS` export
- Above `POLLING_CONFIG` export
- Above `normalizeUrl` function

**Success criteria**:
- [ ] All 4 files have clear warnings
- [ ] Warnings specify which config/function is duplicated
- [ ] Deployment commands referenced

---

## Phase 3 – Composite Workflows & CI/CD (Batch 3) (1-2 hours) ❌ MEDIUM

### Objective
Create composite npm scripts for common workflows: check all configs, deploy all Edge Functions, pre-deployment validation, CI/CD pipeline.

### Prerequisites
- [x] Phase 1 de-scoped (AI notes check config consolidated in Edge Function)
- [x] Phase 2 complete (short-form sync automation live)

### Step 3.1 – Create Master Check-Sync Script (15 minutes) ❌

**Purpose**: Run all sync checks across all Edge Functions.

**Package.json addition**:
```json
{
  "scripts": {
    "check-sync:all": "npm run check-sync:ai-analysis && npm run check-sync:short-form-processor"
  }
}
```

**Behavior**:
- Runs all AI notes check validations first
- Then runs all short-form validations
- Stops on first failure
- Reports which Edge Function's check failed

**Use cases**:
- Before committing changes that touch configs
- In pre-push git hook
- In CI/CD pipeline

**Validation**:
```bash
npm run check-sync:all  # Should validate all 5 duplications
```

**Success criteria**:
- [ ] Runs all sync checks in order
- [ ] Clear output showing progress per Edge Function
- [ ] Fails fast on first mismatch

### Step 3.2 – Create Deploy All Edge Functions Script (15 minutes) ❌

**Purpose**: Deploy all Edge Functions with sync validation.

**Package.json addition**:
```json
{
  "scripts": {
    "deploy:edge:all": "npm run check-sync:all && npx supabase functions deploy"
  }
}
```

**Behavior**:
- Validates all configs first
- Deploys all Edge Functions simultaneously (Supabase CLI default)
- Single command for full backend deployment

**Validation**:
```bash
npm run deploy:edge:all  # Should check all, then deploy all functions
```

**Success criteria**:
- [ ] All sync checks pass before any deployment
- [ ] Supabase CLI deploys all functions
- [ ] Clear output showing validation → deployment flow

### Step 3.3 – Create Pre-Deployment Validation Script (20 minutes) ❌

**Purpose**: Run all quality checks before deploying to production.

**Package.json addition**:
```json
{
  "scripts": {
    "pre-deploy": "npm run typecheck && npm run lint && npm run check-sync:all && npm run validate:edge:all"
  }
}
```

**Checks included**:
1. `typecheck` - TypeScript compilation (no emit)
2. `lint` - ESLint validation
3. `check-sync:all` - All config sync checks
4. `validate:edge:all` - Edge Function secrets validation (Phase 4)

**Use cases**:
- Before deploying to production
- Before creating pull request
- In CI/CD pre-merge checks

**Validation**:
```bash
npm run pre-deploy  # Should run all checks, report summary
```

**Success criteria**:
- [ ] Runs all checks in logical order
- [ ] Fails fast on first error
- [ ] Clear summary of what passed/failed

### Step 3.4 – Create CI/CD Pipeline Script (20 minutes) ❌

**Purpose**: Automated checks for GitHub Actions / CI environment.

**Package.json addition**:
```json
{
  "scripts": {
    "ci": "npm run typecheck && npm run lint && npm run build && npm run check-sync:all"
  }
}
```

**Differences from pre-deploy**:
- Includes `build` to verify frontend builds successfully
- Excludes Edge Function deployment (separate CI step)
- Suitable for pull request validation

**GitHub Actions integration** (optional future work):
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run ci
```

**Success criteria**:
- [ ] Script suitable for CI environment
- [ ] No interactive prompts
- [ ] Clear exit codes (0 = pass, 1 = fail)

---

## Phase 4 – Edge Function Secrets Validation (Bonus) (2-3 hours) ❌ LOW

### Objective
Create validation script that checks required environment variables/secrets are configured before deploying Edge Functions.

### Prerequisites
- [ ] Phases 1-3 complete
- [ ] Supabase CLI secrets commands understood

### Step 4.1 – Define Required Secrets per Edge Function (20 minutes) ❌

**File**: `scripts/edge-function-secrets.json` (NEW)

**Purpose**: Central registry of required secrets per Edge Function.

**Content**:
```json
{
  "ai-notes-check": {
    "required": ["ANTHROPIC_API_KEY"],
    "optional": []
  },
  "short-form": {
    "required": ["YOUTUBE_API_KEY"],
    "optional": ["TIKTOK_API_KEY", "INSTAGRAM_API_KEY"]
  }
}
```

**Validation**: JSON schema valid, all active Edge Functions represented.

### Step 4.2 – Create Secrets Validation Script (90 minutes) ❌

**File**: `scripts/validate-edge-function.js` (NEW)

**Purpose**: Check that required secrets are set in Supabase before deployment.

**Implementation approach**:
```javascript
// Usage: node scripts/validate-edge-function.js ai-notes-check

import { execSync } from 'child_process';
import secrets from './edge-function-secrets.json';

const functionName = process.argv[2];
const config = secrets[functionName];

// List all secrets
const output = execSync('npx supabase secrets list --json', { encoding: 'utf-8' });
const setSecrets = JSON.parse(output);

// Check required secrets are present
for (const secret of config.required) {
  if (!setSecrets.includes(secret)) {
    console.error(`❌ Missing required secret: ${secret}`);
    process.exit(1);
  }
}

console.log('✅ All required secrets configured');
```

**Note**: Supabase CLI may not support `--json` flag; fallback to parsing text output or using Supabase Management API.

**Error output**:
```
❌ VALIDATION ERROR: ai-notes-check missing required secrets

  Missing:
  - ANTHROPIC_API_KEY

  ACTION: Run `npx supabase secrets set ANTHROPIC_API_KEY=your_key`
```

**Validation**:
```bash
npm run validate:edge:ai-notes-check  # Should check ANTHROPIC_API_KEY exists
```

**Success criteria**:
- [ ] Reads secrets registry
- [ ] Checks Supabase secrets via CLI
- [ ] Reports missing secrets clearly
- [ ] Exits with code 1 if any missing

### Step 4.3 – Integrate Secrets Validation into Deployment (20 minutes) ❌

**Package.json updates**:
```json
{
  "scripts": {
    "validate:edge:ai-notes-check": "node scripts/validate-edge-function.js ai-notes-check",
    "validate:edge:short-form": "node scripts/validate-edge-function.js short-form",
    "validate:edge:all": "npm run validate:edge:ai-notes-check && npm run validate:edge:short-form",
    "deploy:edge:ai-notes-check": "npm run check-sync:ai-notes-check && npm run validate:edge:ai-notes-check && npx supabase functions deploy ai-notes-check",
    "deploy:edge:short-form": "npm run check-sync:short-form && npm run validate:edge:short-form && npx supabase functions deploy short-form"
  }
}
```

**Deployment flow**:
1. Check config sync
2. Validate secrets configured
3. Deploy function

**Success criteria**:
- [ ] Secrets validated before deployment
- [ ] Clear error if secrets missing
- [ ] Deployment blocked until secrets configured

---

## Phase 5 – Testing & Validation (1-2 hours) ❌ HIGH

### Objective
Validate all sync check scripts work correctly with positive and negative test cases.

### Test Cases

#### Test 5.1 – AI Config Sync: Happy Path (10 minutes) ❌

**Setup**: Ensure AI_CONFIG is synced between frontend and Edge Function.

**Execute**:
```bash
npm run check-sync:ai-model-settings
npm run deploy:edge:ai-notes-check
```

**Expected**:
- ✅ Sync check passes
- ✅ Deployment proceeds
- ✅ Edge Function deployed successfully

#### Test 5.2 – AI Config Sync: Blocked Deployment (15 minutes) ❌

**Setup**: Modify AI_CONFIG in frontend, don't sync to Edge Function.

**Execute**:
```bash
npm run deploy:edge:ai-notes-check
```

**Expected**:
- ❌ Sync check fails with clear error message
- ❌ Deployment blocked (never reaches `npx supabase functions deploy`)
- ✅ Error message shows exactly which files are out of sync
- ✅ Error message provides action steps (copy changes, re-run)

#### Test 5.3 – AI Metadata Sync: Validation (15 minutes) ❌

**Setup**: Modify AI_METADATA_CONFIG in frontend, ensure Edge Function differs.

**Execute**:
```bash
npm run check-sync:ai-metadata-fields
```

**Expected**:
- ❌ Sync check fails
- ✅ Error specific to metadata config (not generic)

#### Test 5.4 – Short-Form Config: Multiple Configs (20 minutes) ❌

**Setup**:
- Modify PLATFORM_CONFIGS (keep POLLING_CONFIG synced)
- OR modify POLLING_CONFIG (keep PLATFORM_CONFIGS synced)

**Execute**:
```bash
npm run check-sync:video-platform-extraction
```

**Expected**:
- ❌ Sync check fails
- ✅ Error shows which specific config is out of sync
- ✅ Other config marked as synced in output

#### Test 5.5 – Short-Form Utils: Function Sync (20 minutes) ❌

**Setup**: Modify `normalizeUrl` function in frontend (add comment or change logic).

**Execute**:
```bash
npm run check-sync:url-normalization
```

**Expected**:
- ❌ Sync check fails for logic changes
- ✅ (Optional) Passes for comment-only changes if normalization works

#### Test 5.6 – Composite Workflows (15 minutes) ❌

**Setup**: All configs synced.

**Execute**:
```bash
npm run check-sync:all
npm run pre-deploy
npm run ci
```

**Expected**:
- ✅ All scripts run successfully
- ✅ Clear progress output showing each check
- ✅ Summary of validation results

#### Test 5.7 – Fast Failure (10 minutes) ❌

**Setup**: Modify AI_CONFIG (leave others synced).

**Execute**:
```bash
npm run check-sync:all
```

**Expected**:
- ❌ Fails on AI config check
- ✅ Stops immediately (doesn't run short-form checks)
- ✅ Clear indication which check failed

### Validation Checklist

- [ ] All positive tests pass (synced configs deploy successfully)
- [ ] All negative tests block deployment with clear errors
- [ ] Error messages actionable (show files, provide commands)
- [ ] Scripts have appropriate exit codes (0 = success, 1 = failure)
- [ ] No false positives (formatting differences don't cause failures)
- [ ] Fast failure (stops on first error, doesn't run remaining checks)
- [ ] Scripts work on Windows PowerShell (project environment)

---

## Success Criteria

### Phase 0 (Documentation)
- ✅ Warning comments in all 7 duplicated files
- ✅ CLAUDE.md documents sync workflow
- ✅ AI assistants and developers aware of sync requirements

### Phase 1 (AI Notes Check)
- [x] De-scoped: AI configs now live exclusively in supabase/functions/ai-notes-check/config.ts
- [x] No sync checker required for AI config duplication

### Phase 2 (Short-Form)
- [x] PLATFORM_CONFIGS + POLLING_CONFIG sync check working via scripts/check-config-sync.js
- [x] normalizeUrl function sync check working
- [x] Unified checker validates all short-form duplications before deployment
- [x] Warning comments present in duplicated short-form files
- [x] npm run deploy:edge:short-form blocks when files are out of sync

### Phase 3 (Composite Workflows)
- [ ] Master sync check validates all 5 duplications
- [ ] Deploy all Edge Functions with validation
- [ ] Pre-deployment script runs all quality checks
- [ ] CI/CD script suitable for automation

### Phase 4 (Secrets Validation - Optional)
- [ ] Secrets registry created
- [ ] Validation script checks required secrets
- [ ] Integrated into deployment commands
- [ ] Clear errors when secrets missing

### Phase 5 (Testing)
- [ ] All test cases pass
- [ ] No false positives
- [ ] Clear, actionable error messages
- [ ] Fast failure on first error

---

## Deployment Notes

### Script Execution

**Individual checks** (fast iteration):
```bash
npm run check-sync:ai-model-settings           # ~0.1s
npm run check-sync:ai-metadata-fields          # ~0.1s
npm run check-sync:video-platform-extraction   # ~0.1s
npm run check-sync:video-polling-settings      # ~0.1s
npm run check-sync:url-normalization           # ~0.2s
```

**Composite checks** (per Edge Function):
```bash
npm run check-sync:ai-analysis        # ~0.2s (model + metadata)
npm run check-sync:short-form-processor  # ~0.4s (platform + polling + URL)
npm run check-sync:all                # ~0.6s
```

**Deployment** (with validation):
```bash
npm run deploy:edge:ai-notes-check     # ~30s
npm run deploy:edge:short-form         # ~30s
npm run deploy:edge:all                # ~45s
```

**Quality gates**:
```bash
npm run pre-deploy                     # ~20s (typecheck + lint + sync + validate)
npm run ci                             # ~60s (includes build)
```

### Migration Path

**Current state**: Manual sync, one generic `check-sync` script.

**After Phase 1**: AI notes check automated.
```bash
# Old way
npx supabase functions deploy ai-notes-check  # No validation

# New way
npm run deploy:edge:ai-notes-check  # Validates AI model settings + metadata fields
```

**After Phase 2**: Short-form automated.
```bash
npm run deploy:edge:short-form  # Validates video platform + polling + URL normalization
```

**After Phase 3**: Full automation.
```bash
npm run deploy:edge:all    # Validates everything, deploys all functions
npm run pre-deploy         # Full quality gate
```

### Future Improvements

**Database-backed config** (discussed in conversation):
- Move configs to `app_config` table
- Manage via admin dashboard
- No duplication, no sync scripts needed
- Change config without deployment
- Suitable for A/B testing, feature flags

**Build-time sync** (alternative to runtime checks):
- Generate Edge Function configs from frontend source
- Run as pre-build step
- Zero duplication in source control
- Requires build process changes

**Monorepo approach** (major refactor):
- Shared package for common configs
- Both frontend and Edge Functions import
- Type-safe, zero duplication
- Requires project restructuring

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| False positives from formatting | Medium | Medium | Normalize whitespace/comments in comparison |
| Function sync detection fragile | High | Medium | Use strict string comparison initially, upgrade to AST if needed |
| Scripts don't work on Windows | High | Low | Test in PowerShell (project environment), use cross-platform Node.js APIs |
| Developers bypass scripts | Medium | Medium | Document in CLAUDE.md, use pre-commit hooks (future) |
| Secrets validation requires API access | Low | Medium | Fallback to manual secret checks if CLI doesn't support JSON output |

---

## Appendix

### Alternative Approaches Considered

**Option 1: Monorepo with shared packages**
- Pros: Zero duplication, type-safe, industry standard
- Cons: Requires major restructuring, learning curve
- Decision: Deferred (too much refactoring for current project state)

**Option 2: Build-time code generation**
- Pros: Single source of truth, automated sync
- Cons: Adds build complexity, generated files in git
- Decision: Considered for future (simpler than monorepo)

**Option 3: Environment variables only**
- Pros: Central management, no duplication
- Cons: Not suitable for complex objects (prompts, configs)
- Decision: Not viable for long prompts and nested configs

**Option 4: Admin dashboard + database config**
- Pros: Non-technical edits, instant updates, no deployments
- Cons: Loses type safety, harder to version control changes
- Decision: Future enhancement after sync automation stable

**Selected: Separate scripts + composition**
- Pros: No restructuring, fast iteration, clear errors, flexible workflows
- Cons: Requires manual sync (but automated validation)
- Decision: Best pragmatic solution for current project

### References

- **Conversation**: Config sync discussion (2025-10-17)
- **Related Plans**: AI Notes Check System implementation (10-16)
- **CLAUDE.md**: Critical Code Patterns → Configuration File Synchronization
- **Industry Practices**: Unix philosophy (do one thing well), npm script composition patterns
