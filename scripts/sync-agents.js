#!/usr/bin/env node
import { copyFileSync } from 'fs';
import { exit } from 'process';

const SOURCE = 'CLAUDE.md';
const TARGET = 'AGENTS.md';

try {
  copyFileSync(SOURCE, TARGET);
  console.log(`✅ Synced ${TARGET} from ${SOURCE}`);
  exit(0);
} catch (err) {
  console.error(`❌ Error syncing files: ${err.message}`);
  exit(1);
}

