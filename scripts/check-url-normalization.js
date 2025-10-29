#!/usr/bin/env node

/**
 * Sync Check Script: normalizeUrl function
 *
 * Validates that normalizeUrl function logic is identical between:
 * - Frontend: src/utils/urlDetection.ts (source of truth)
 * - Edge Function: supabase/functions/short-form/utils/urlUtils.ts (copy)
 *
 * Note: The only allowed difference is logging (console.error vs logWarn)
 *
 * Exit codes:
 * - 0: Function logic is in sync
 * - 1: Function logic is out of sync or error occurred
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// File paths
const FRONTEND_FILE = join(PROJECT_ROOT, 'src/utils/urlDetection.ts');
const EDGE_FUNCTION_FILE = join(PROJECT_ROOT, 'supabase/functions/short-form/utils/urlUtils.ts');

/**
 * Extract normalizeUrl function from a TypeScript file
 * Extracts the complete function including its body
 */
function extractNormalizeUrlFunction(content) {
  // Match: export function normalizeUrl(...) { ... }
  // This regex finds the function declaration and captures everything until the matching closing brace
  const regex = /export function normalizeUrl\([^)]*\)[^{]*\{([\s\S]*?)\n\}/m;
  const match = content.match(regex);

  if (!match) {
    return null;
  }

  return match[1]; // Return just the function body
}

/**
 * Normalize function string for comparison
 * Removes whitespace, comments, and known logging differences
 */
function normalizeFunctionBody(funcBody) {
  if (!funcBody) return '';

  return funcBody
    // Remove inline comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Normalize logging statements (different between frontend and Edge Function)
    .replace(/console\.error\([^)]*\)/g, 'LOG_PLACEHOLDER')
    .replace(/console\.log\([^)]*\)/g, 'LOG_PLACEHOLDER')
    .replace(/logWarn\([^)]*\)/g, 'LOG_PLACEHOLDER')
    .replace(/logInfo\([^)]*\)/g, 'LOG_PLACEHOLDER')
    // Remove all whitespace
    .replace(/\s+/g, '')
    // Normalize quotes (single to double)
    .replace(/'/g, '"');
}

/**
 * Main validation logic
 */
function validateSync() {
  console.log('🔍 Checking normalizeUrl function sync...\n');

  // Read files
  let frontendContent, edgeContent;

  try {
    frontendContent = readFileSync(FRONTEND_FILE, 'utf-8');
  } catch (error) {
    console.error(`❌ ERROR: Could not read frontend file: ${FRONTEND_FILE}`);
    console.error(`   ${error.message}\n`);
    return false;
  }

  try {
    edgeContent = readFileSync(EDGE_FUNCTION_FILE, 'utf-8');
  } catch (error) {
    console.error(`❌ ERROR: Could not read Edge Function file: ${EDGE_FUNCTION_FILE}`);
    console.error(`   ${error.message}\n`);
    return false;
  }

  // Extract functions
  const frontendFunc = extractNormalizeUrlFunction(frontendContent);
  const edgeFunc = extractNormalizeUrlFunction(edgeContent);

  if (!frontendFunc) {
    console.error(`❌ ERROR: Could not extract normalizeUrl function from frontend file`);
    console.error(`   File: ${FRONTEND_FILE}`);
    console.error(`   Make sure the function is exported with the correct format\n`);
    return false;
  }

  if (!edgeFunc) {
    console.error(`❌ ERROR: Could not extract normalizeUrl function from Edge Function file`);
    console.error(`   File: ${EDGE_FUNCTION_FILE}`);
    console.error(`   Make sure the function is exported with the correct format\n`);
    return false;
  }

  // Normalize and compare
  const normalizedFrontend = normalizeFunctionBody(frontendFunc);
  const normalizedEdge = normalizeFunctionBody(edgeFunc);

  if (normalizedFrontend !== normalizedEdge) {
    console.error('❌ SYNC ERROR: normalizeUrl function is out of sync!\n');
    console.error('  Source of Truth: src/utils/urlDetection.ts');
    console.error('  Must Sync To:    supabase/functions/short-form/utils/urlUtils.ts\n');
    console.error('  ACTION REQUIRED:');
    console.error('  1. Copy normalizeUrl function logic from frontend to Edge Function');
    console.error('  2. Keep logging differences (console.error vs logWarn) - those are allowed');
    console.error('  3. Ensure all other logic is identical');
    console.error('  4. Re-run this check: npm run check-sync:url-normalization\n');
    return false;
  }

  console.log('✅ normalizeUrl function logic is in sync!');
  console.log('   (Logging differences are ignored as expected)\n');
  return true;
}

// Run validation
const success = validateSync();
process.exit(success ? 0 : 1);
