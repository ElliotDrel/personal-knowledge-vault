#!/usr/bin/env node

/**
 * Sync Check Script: POLLING_CONFIG
 *
 * Validates that POLLING_CONFIG constant is identical between:
 * - Frontend: src/types/shortFormApi.ts (source of truth)
 * - Edge Function: supabase/functions/short-form/types.ts (copy)
 *
 * Exit codes:
 * - 0: Configs are in sync
 * - 1: Configs are out of sync or error occurred
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// File paths
const FRONTEND_FILE = join(PROJECT_ROOT, 'src/types/shortFormApi.ts');
const EDGE_FUNCTION_FILE = join(PROJECT_ROOT, 'supabase/functions/short-form/types.ts');

/**
 * Extract POLLING_CONFIG constant from a TypeScript file
 */
function extractPollingConfig(content) {
  // Match: export const POLLING_CONFIG = { ... } as const;
  const regex = /export const POLLING_CONFIG\s*=\s*(\{[\s\S]*?\})\s*as const;/;
  const match = content.match(regex);

  if (!match) {
    return null;
  }

  return match[1]; // Return just the object literal
}

/**
 * Normalize config string for comparison
 * Removes whitespace, inline comments, and formatting differences
 */
function normalizeConfig(configStr) {
  if (!configStr) return '';

  return configStr
    // Remove inline comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove all whitespace
    .replace(/\s+/g, '')
    // Normalize quotes (single to double)
    .replace(/'/g, '"');
}

/**
 * Main validation logic
 */
function validateSync() {
  console.log('🔍 Checking POLLING_CONFIG sync...\n');

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

  // Extract configs
  const frontendConfig = extractPollingConfig(frontendContent);
  const edgeConfig = extractPollingConfig(edgeContent);

  if (!frontendConfig) {
    console.error(`❌ ERROR: Could not extract POLLING_CONFIG from frontend file`);
    console.error(`   File: ${FRONTEND_FILE}`);
    console.error(`   Make sure the constant is exported with the correct format\n`);
    return false;
  }

  if (!edgeConfig) {
    console.error(`❌ ERROR: Could not extract POLLING_CONFIG from Edge Function file`);
    console.error(`   File: ${EDGE_FUNCTION_FILE}`);
    console.error(`   Make sure the constant is exported with the correct format\n`);
    return false;
  }

  // Normalize and compare
  const normalizedFrontend = normalizeConfig(frontendConfig);
  const normalizedEdge = normalizeConfig(edgeConfig);

  if (normalizedFrontend !== normalizedEdge) {
    console.error('❌ SYNC ERROR: POLLING_CONFIG is out of sync!\n');
    console.error('  Source of Truth: src/types/shortFormApi.ts');
    console.error('  Must Sync To:    supabase/functions/short-form/types.ts\n');
    console.error('  ACTION REQUIRED:');
    console.error('  1. Copy POLLING_CONFIG from frontend to Edge Function');
    console.error('  2. Ensure both files have identical config values');
    console.error('  3. Re-run this check: npm run check-sync:video-polling-settings\n');
    return false;
  }

  console.log('✅ POLLING_CONFIG is in sync!\n');
  return true;
}

// Run validation
const success = validateSync();
process.exit(success ? 0 : 1);
