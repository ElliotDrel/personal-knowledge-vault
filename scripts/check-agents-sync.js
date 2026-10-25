#!/usr/bin/env node
import { readFileSync } from 'fs';
import { exit } from 'process';

const SOURCE = 'CLAUDE.md';
const TARGET = 'AGENTS.md';

try {
  const sourceContent = readFileSync(SOURCE, 'utf8');
  const targetContent = readFileSync(TARGET, 'utf8');
  
  if (sourceContent !== targetContent) {
    console.error(`\n❌ ${TARGET} is out of sync with ${SOURCE}\n`);
    console.error(`Fix: Run sync command\n`);
    console.error(`  npm run sync:agents\n`);
    exit(1);
  }
  
  console.log(`✅ ${SOURCE} and ${TARGET} are in sync`);
  exit(0);
} catch (err) {
  console.error(`❌ Error checking sync: ${err.message}`);
  exit(1);
}

