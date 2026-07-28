#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourceId = process.argv[2]?.trim();

if (!sourceId) {
  console.error(`Usage:
npm run discover -- <source-id>

Example:
npm run discover -- isro`);
  process.exit(1);
}

const sources = JSON.parse(
  await readFile(new URL('./sources.json', import.meta.url), 'utf8')
);
const enabledIds = sources
  .filter((source) => source.id && !source._comment && source.enabled)
  .map((source) => source.id);

if (!enabledIds.includes(sourceId)) {
  console.error(`Invalid source ID: ${sourceId}

Available enabled source IDs:
${enabledIds.map((id) => `- ${id}`).join('\n')}`);
  process.exit(1);
}

const scraperPath = fileURLToPath(new URL('./scraper.js', import.meta.url));
const child = spawn(process.execPath, [scraperPath, '--discover', sourceId], {
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Unable to start discovery: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Discovery stopped by signal: ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
