#!/usr/bin/env node

/**
 * Unified config sync checker.
 *
 * Validates that duplicated constants/functions stay in sync between
 * frontend source files (source of truth) and Supabase Edge Function copies.
 *
 * Exit codes:
 * - 0: All monitored sections are in sync
 * - 1: Any mismatch or error occurred
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

let ts;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const SOURCE_FILES = new Map();

const pairs = [
  {
    id: 'PLATFORM_CONFIGS',
    description: 'PLATFORM_CONFIGS constant',
    sourceFile: 'src/types/shortFormApi.ts',
    targetFile: 'supabase/functions/short-form/types.ts',
    extractor: extractExportedConst('PLATFORM_CONFIGS'),
    normalizer: normalizeExpression,
  },
  {
    id: 'POLLING_CONFIG',
    description: 'POLLING_CONFIG constant',
    sourceFile: 'src/types/shortFormApi.ts',
    targetFile: 'supabase/functions/short-form/types.ts',
    extractor: extractExportedConst('POLLING_CONFIG'),
    normalizer: normalizeExpression,
  },
  {
    id: 'normalizeUrl',
    description: 'normalizeUrl function logic',
    sourceFile: 'src/utils/urlDetection.ts',
    targetFile: 'supabase/functions/short-form/utils/urlUtils.ts',
    extractor: extractFunction('normalizeUrl'),
    normalizer: normalizeFunction,
  },
];

function loadSourceFile(relativePath) {
  if (SOURCE_FILES.has(relativePath)) {
    return SOURCE_FILES.get(relativePath);
  }

  const absolutePath = join(PROJECT_ROOT, relativePath);
  let content;

  try {
    content = readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file: ${relativePath}\n  ${error.message}`);
  }

  const sourceFile = ts.createSourceFile(
    relativePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  SOURCE_FILES.set(relativePath, { sourceFile, absolutePath, content });
  return SOURCE_FILES.get(relativePath);
}

function extractExportedConst(constName) {
  return (meta) => {
    const { sourceFile } = loadSourceFile(meta.filePath);
    const printer = ts.createPrinter({ removeComments: true });

    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }

      const isExported = statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      );

      if (!isExported) {
        continue;
      }

      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== constName) {
          continue;
        }

        let initializer = declaration.initializer;

        if (!initializer) {
          throw new Error(`Const "${constName}" has no initializer in ${meta.filePath}`);
        }

        if (ts.isAsExpression(initializer)) {
          initializer = initializer.expression;
        }

        const printed = printer.printNode(ts.EmitHint.Unspecified, initializer, sourceFile);

        return printed;
      }
    }

    throw new Error(`Unable to find exported const "${constName}" in ${meta.filePath}`);
  };
}

function extractFunction(functionName) {
  return (meta) => {
    const { sourceFile } = loadSourceFile(meta.filePath);
    const printer = ts.createPrinter({ removeComments: true });

    for (const statement of sourceFile.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === functionName) {
        const printed = printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile);
        return printed;
      }
    }

    throw new Error(`Unable to find exported function "${functionName}" in ${meta.filePath}`);
  };
}

function normalizeExpression(expressionText) {
  return normalizeText(expressionText);
}

function normalizeFunction(functionText) {
  const normalizedLogs = functionText
    .replace(/console\.(error|log)\s*\(/g, 'LOG_PLACEHOLDER(')
    .replace(/log(Info|Warn)\s*\(/g, 'LOG_PLACEHOLDER(');

  return normalizeText(normalizedLogs);
}

function normalizeText(text) {
  return text
    .replace(/\s+/g, '')
    .replace(/;/g, '');
}

function run() {
  console.log('[sync] Running unified config sync check...\n');

  const errors = [];

  for (const pair of pairs) {
    const sourceMeta = { filePath: pair.sourceFile };
    const targetMeta = { filePath: pair.targetFile };

    try {
      const sourceText = pair.extractor(sourceMeta);
      const targetText = pair.extractor(targetMeta);

      const normalizedSource = pair.normalizer(sourceText);
      const normalizedTarget = pair.normalizer(targetText);

      if (normalizedSource !== normalizedTarget) {
        errors.push({
          pair,
          sourceText,
          targetText,
        });

        console.error(`[fail] Sync mismatch detected for "${pair.description}"`);
        console.error(`  Source of truth: ${pair.sourceFile}`);
        console.error(`  Needs sync to:   ${pair.targetFile}\n`);
      } else {
        console.log(`[ok] ${pair.description} is in sync`);
      }
    } catch (error) {
      errors.push({ pair, error });
      console.error(`[fail] Error checking "${pair.description}": ${error.message}\n`);
    }
  }

  if (errors.length > 0) {
    console.error('[fail] Config sync validation failed.');
    console.error('  Resolve the mismatches above, then re-run: npm run check-sync:all\n');
    process.exit(1);
  }

  console.log('\n[ok] All monitored configs/functions are in sync!\n');
  process.exit(0);
}

async function bootstrap() {
  try {
    ({ default: ts } = await import('typescript'));
  } catch (error) {
    console.error('[fail] Could not load the "typescript" package.');
    console.error('  Install project dependencies before running this check: npm install\n');
    process.exit(1);
  }

  run();
}

bootstrap();
